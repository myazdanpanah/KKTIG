"""Finance permission decorator and DRF permission class."""

from functools import wraps
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework import status


class FinancePermission(BasePermission):
    """DRF permission class that checks finance permission flags."""

    def __init__(self, perm_name='can_view_finance'):
        self.perm_name = perm_name
        super().__init__()

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.role in ('ceo', 'admin') or user.is_staff:
            return True
        return getattr(user, self.perm_name, False)


def finance_permission(perm_name):
    """Decorator for function-based views to check a finance permission."""
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            user = request.user
            if not user or not user.is_authenticated:
                return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
            if user.role in ('ceo', 'admin') or user.is_staff:
                return view_func(request, *args, **kwargs)
            if not getattr(user, perm_name, False):
                return Response({'error': f'Permission denied: {perm_name}'}, status=status.HTTP_403_FORBIDDEN)
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


def get_user_company(user):
    """Get the user's company, raising if None."""
    if not user.company:
        raise ValueError('User has no company assigned')
    return user.company
