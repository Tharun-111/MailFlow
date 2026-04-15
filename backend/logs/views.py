"""
Logs Views — Email Automation System
Admin dashboard analytics, filtering, and CSV export.
"""
import csv
from django.http import HttpResponse
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from emails.models import EmailLog, EmailTemplate
from emails.serializers import EmailLogSerializer


class EmailLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only log viewer with analytics and CSV export.
    GET /api/logs/              — All logs (paginated)
    GET /api/logs/analytics/    — Dashboard stats
    GET /api/logs/export_csv/   — Download CSV
    """
    queryset = EmailLog.objects.select_related('student').all()
    serializer_class = EmailLogSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'email_type', 'has_attachment']
    search_fields = ['student__name', 'student__email', 'recipient_email', 'subject']
    ordering_fields = ['created_at', 'sent_at', 'status']
    ordering = ['-created_at']

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Dashboard analytics: totals, by type, by status, trend."""
        now = timezone.now()
        last_30 = now - timedelta(days=30)
        last_7 = now - timedelta(days=7)

        total = EmailLog.objects.count()
        sent = EmailLog.objects.filter(status='sent').count()
        failed = EmailLog.objects.filter(status='failed').count()
        pending = EmailLog.objects.filter(status='pending').count()

        # By email type
        by_type = list(
            EmailLog.objects.values('email_type')
            .annotate(count=Count('id'), sent=Count('id', filter=Q(status='sent')))
            .order_by('-count')
        )

        # Last 30 days daily trend
        trend = []
        for i in range(30, -1, -1):
            day = (now - timedelta(days=i)).date()
            day_sent = EmailLog.objects.filter(
                created_at__date=day, status='sent'
            ).count()
            day_failed = EmailLog.objects.filter(
                created_at__date=day, status='failed'
            ).count()
            trend.append({'date': str(day), 'sent': day_sent, 'failed': day_failed})

        return Response({
            'total': total,
            'sent': sent,
            'failed': failed,
            'pending': pending,
            'success_rate': round((sent / total * 100) if total else 0, 1),
            'last_7_days': EmailLog.objects.filter(created_at__gte=last_7).count(),
            'last_30_days': EmailLog.objects.filter(created_at__gte=last_30).count(),
            'by_type': by_type,
            'trend': trend,
        })

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """Export all logs as a downloadable CSV file."""
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="email_logs.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'ID', 'Student Name', 'Student Email', 'Email Type', 'Status',
            'Subject', 'Has Attachment', 'Retry Count', 'Error Message',
            'Sent At', 'Created At'
        ])

        logs = EmailLog.objects.select_related('student').all()
        for log in logs:
            writer.writerow([
                log.id,
                log.student.name,
                log.student.email,
                log.email_type,
                log.status,
                log.subject,
                log.has_attachment,
                log.retry_count,
                log.error_message,
                log.sent_at.isoformat() if log.sent_at else '',
                log.created_at.isoformat(),
            ])

        return response
