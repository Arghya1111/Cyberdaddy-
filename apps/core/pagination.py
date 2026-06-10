"""
CyberDaddy - Custom Pagination Classes
"""

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardResultsSetPagination(PageNumberPagination):
    """Standard pagination for list endpoints (default: 20 items/page)."""
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100
    page_query_param = "page"

    def get_paginated_response(self, data):
        return Response({
            "count": self.page.paginator.count,
            "total_pages": self.page.paginator.num_pages,
            "current_page": self.page.number,
            "next": self.get_next_link(),
            "previous": self.get_previous_link(),
            "results": data,
        })

    def get_paginated_response_schema(self, schema):
        return {
            "type": "object",
            "properties": {
                "count": {"type": "integer"},
                "total_pages": {"type": "integer"},
                "current_page": {"type": "integer"},
                "next": {"type": "string", "nullable": True},
                "previous": {"type": "string", "nullable": True},
                "results": schema,
            },
        }


class LargeResultsSetPagination(PageNumberPagination):
    """For threat database and bulk exports (up to 500 items/page)."""
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 500


class SmallResultsSetPagination(PageNumberPagination):
    """For dashboards with limited items (default: 10 items/page)."""
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50
