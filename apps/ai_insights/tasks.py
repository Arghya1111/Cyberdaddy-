"""
CyberDaddy - AI Insights Celery Tasks
"""

import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(
    name="apps.ai_insights.tasks.generate_daily_insights",
    queue="ai",
    time_limit=600,
)
def generate_daily_insights():
    """
    Nightly Celery Beat task that regenerates AI insights for all active users.
    Processes in batches to avoid memory issues with 100k+ users.
    """
    from apps.users.models import User

    # Process users in chunks of 100
    batch_size = 100
    offset = 0
    total_processed = 0

    while True:
        users = list(
            User.objects.filter(
                account_status="active",
                is_active=True,
            )
            .values_list("id", flat=True)[offset:offset + batch_size]
        )

        if not users:
            break

        for user_id in users:
            from django.conf import settings as _settings
            if getattr(_settings, 'CELERY_TASK_ALWAYS_EAGER', False):
                try:
                    generate_user_insights_task(str(user_id))
                except Exception as exc:
                    logger.warning(f"Insights generation failed for {user_id}: {exc}")
            else:
                generate_user_insights_task.delay(str(user_id))
            total_processed += 1

        offset += batch_size

    logger.info(f"Dispatched daily insights generation for {total_processed} users")
    return {"processed": total_processed}


@shared_task(
    bind=True,
    name="apps.ai_insights.tasks.generate_user_insights_task",
    max_retries=2,
    default_retry_delay=60,
    queue="ai",
)
def generate_user_insights_task(self, user_id: str):
    """
    Generate AI insights for a single user.
    Called individually for real-time updates or in batch by generate_daily_insights.
    """
    import openai
    import json
    from datetime import timedelta
    from django.conf import settings
    from django.db.models import Count, Avg

    from apps.users.models import User
    from apps.scam_detection.models import ScanHistory
    from apps.ai_insights.models import AIInsight

    try:
        user = User.objects.get(id=user_id)
        now = timezone.now()

        # Gather scan data for the past 30 days
        recent_scans = ScanHistory.objects.filter(
            user=user,
            created_at__gte=now - timedelta(days=30),
            status=ScanHistory.ScanStatus.COMPLETED,
        )

        total_scans = recent_scans.count()
        threats = recent_scans.filter(is_threat=True).count()

        # Category breakdown
        categories = dict(
            recent_scans.filter(is_threat=True)
            .values("scam_category")
            .annotate(count=Count("id"))
            .values_list("scam_category", "count")
        )

        # Weekly trend (last 8 weeks)
        weekly_trend = []
        for week in range(8, 0, -1):
            week_start = now - timedelta(weeks=week)
            week_end = now - timedelta(weeks=week - 1)
            week_scans = ScanHistory.objects.filter(
                user=user,
                created_at__gte=week_start,
                created_at__lt=week_end,
                status=ScanHistory.ScanStatus.COMPLETED,
            )
            weekly_trend.append({
                "week": week_start.strftime("%Y-W%W"),
                "scans": week_scans.count(),
                "threats": week_scans.filter(is_threat=True).count(),
            })

        # Calculate safety score
        threat_ratio = threats / total_scans if total_scans > 0 else 0
        safety_score = max(0, round(100 - (threat_ratio * 100 * 1.5), 2))

        # Determine risk profile
        if safety_score >= 90:
            risk_profile = "very_safe"
        elif safety_score >= 75:
            risk_profile = "safe"
        elif safety_score >= 55:
            risk_profile = "moderate"
        elif safety_score >= 30:
            risk_profile = "high_risk"
        else:
            risk_profile = "critical"

        # Generate AI recommendations (only if there are threats)
        recommendations = []
        personalized_tips = []
        ai_narrative = ""

        if threats > 0:
            groq_key = getattr(settings, 'GROQ_API_KEY', '')
            openai_key = getattr(settings, 'OPENAI_API_KEY', '')
            if groq_key or openai_key:
                try:
                    import openai as _openai
                    if groq_key:
                        client = _openai.OpenAI(
                            api_key=groq_key,
                            base_url="https://api.groq.com/openai/v1",
                        )
                        insight_model = "llama-3.3-70b-versatile"
                    else:
                        client = _openai.OpenAI(api_key=openai_key)
                        insight_model = getattr(settings, 'OPENAI_MODEL', 'gpt-4o')
                prompt = f"""Based on this user's cybersecurity profile, provide personalized recommendations.
                
User data (last 30 days):
- Total scans: {total_scans}
- Threats detected: {threats}
- Safety score: {safety_score}/100
- Most common scam types: {list(categories.keys())[:5]}
- Risk profile: {risk_profile}

Return JSON with: recommendations (list of 3-5 action items), personalized_tips (list of 3 specific tips), 
narrative (2-3 sentence personalized safety summary)."""

                    response = client.chat.completions.create(
                        model=insight_model,
                        messages=[{"role": "user", "content": prompt}],
                        response_format={"type": "json_object"},
                        max_tokens=500,
                        temperature=0.3,
                    )
                    result = json.loads(response.choices[0].message.content)
                    recommendations = result.get("recommendations", [])
                    personalized_tips = result.get("personalized_tips", [])
                    ai_narrative = result.get("narrative", "")
                except Exception as ai_error:
                    logger.warning(f"AI recommendations skipped for {user_id}: {ai_error}")

        # Upsert AI insights record
        AIInsight.objects.update_or_create(
            user=user,
            defaults={
                "safety_score": safety_score,
                "risk_profile": risk_profile,
                "total_scans": total_scans,
                "total_threats_detected": threats,
                "threats_blocked_this_month": threats,
                "threat_frequency_score": round(threats / 4.3, 2) if threats else 0,  # Per week avg
                "scam_categories_breakdown": categories,
                "top_scam_categories": sorted(categories, key=categories.get, reverse=True)[:5],
                "weekly_scan_trend": weekly_trend,
                "recommendations": recommendations,
                "personalized_tips": personalized_tips,
                "ai_narrative": ai_narrative,
                "last_analyzed_at": now,
            }
        )

        # Update user's safety score
        user.safety_score = safety_score
        user.save(update_fields=["safety_score"])

        # Invalidate cache
        from django.core.cache import cache
        cache.delete(f"ai_insights_{user_id}")
        cache.delete(f"safety_score_{user_id}")

        logger.info(f"AI insights generated for user {user_id}: score={safety_score}")

    except Exception as exc:
        logger.error(f"Failed to generate insights for user {user_id}: {exc}")
        raise self.retry(exc=exc)


@shared_task(
    name="apps.ai_insights.tasks.send_weekly_safety_report",
    queue="notifications",
)
def send_weekly_safety_report():
    """Send weekly safety report email to all active users."""
    from apps.users.models import User
    from apps.notifications.tasks import send_sms_task

    users = User.objects.filter(
        account_status="active",
        notification_preferences__contains={"weekly_report": True},
    ).values_list("id", flat=True)

    for user_id in users:
        from django.conf import settings as _settings
        if getattr(_settings, 'CELERY_TASK_ALWAYS_EAGER', False):
            try:
                send_weekly_report_to_user_task(str(user_id))
            except Exception as exc:
                logger.warning(f"Weekly report failed for {user_id}: {exc}")
        else:
            send_weekly_report_to_user_task.delay(str(user_id))

    return {"dispatched": users.count()}


@shared_task(
    name="apps.ai_insights.tasks.send_weekly_report_to_user_task",
    queue="notifications",
)
def send_weekly_report_to_user_task(user_id: str):
    """Send weekly report to a specific user."""
    try:
        from apps.users.models import User
        from apps.notifications.services import EmailService

        user = User.objects.get(id=user_id)
        try:
            insight = user.ai_insights
        except Exception:
            return

        EmailService.send_templated_email(
            to_email=user.email,
            subject=f"Your Weekly CyberDaddy Safety Report — Score: {insight.safety_score}",
            template="email/weekly_safety_report.html",
            context={
                "user": user,
                "insight": insight,
                "safety_score": float(insight.safety_score),
                "risk_profile": insight.risk_profile,
                "threats_detected": insight.threats_blocked_this_month,
                "recommendations": insight.recommendations[:3],
            }
        )
    except Exception as e:
        logger.error(f"Weekly report failed for user {user_id}: {e}")
