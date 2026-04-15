"""
Celery Tasks — Email Automation System
All async and scheduled email tasks.
"""
import logging
from celery import shared_task
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def send_email_task(self, student_id: int, email_type: str, extra_context: dict = None, attach_pdf: str = None, log_id: int = None):
    """
    Async task to send a single email.
    Auto-retries up to 3 times on failure with 5-min delay.
    """
    from students.models import Student
    from .email_service import email_sending_service

    try:
        student = Student.objects.get(id=student_id)
        success, message = email_sending_service.send_email(
            student=student,
            email_type=email_type,
            extra_context=extra_context or {},
            attach_pdf=attach_pdf,
            log_id=log_id,
        )

        # Notify via WebSocket
        _notify_dashboard(email_type, student.name, success, message)

        if not success:
            raise Exception(message)

        return {'success': True, 'message': message}

    except Exception as exc:
        logger.error(f"send_email_task failed for student {student_id}: {exc}")
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=600)
def send_bulk_email_task(self, student_ids: list, email_type: str, extra_context: dict = None):
    """
    Async task to send bulk emails to multiple students.
    """
    from students.models import Student
    from .email_service import email_sending_service

    students = Student.objects.filter(id__in=student_ids)
    results = email_sending_service.send_bulk_emails(students, email_type, extra_context or {})
    return results


@shared_task
def send_weekly_schedule_emails():
    """
    Scheduled task: Send weekly schedule email to all active students.
    Runs every Sunday at 8 AM.
    """
    from students.models import Student
    students = Student.objects.filter(status='active')
    student_ids = list(students.values_list('id', flat=True))
    if student_ids:
        send_bulk_email_task.delay(student_ids, 'weekly_schedule')
        logger.info(f"Queued weekly schedule emails for {len(student_ids)} students")
    return {'queued': len(student_ids)}


@shared_task
def send_review_reminders():
    """
    Scheduled task: Send review reminder to students with upcoming reviews (next 3 days).
    Runs daily at 9 AM.
    """
    from students.models import Student
    from .email_service import email_sending_service

    today = timezone.now().date()
    reminder_window = today + timedelta(days=3)

    students = Student.objects.filter(
        review_date__gte=today,
        review_date__lte=reminder_window,
        status='active'
    )

    count = 0
    for student in students:
        days_until = (student.review_date - today).days
        success, _ = email_sending_service.send_email(
            student=student,
            email_type='review_reminder',
            extra_context={'days_until_review': days_until},
        )
        if success:
            count += 1

    logger.info(f"Sent {count} review reminder emails")
    return {'sent': count}


@shared_task
def retry_failed_emails():
    """
    Scheduled task: Retry emails that failed and are eligible for retry.
    Runs every 2 hours.
    """
    from .models import EmailLog
    from students.models import Student
    from .email_service import email_sending_service

    retryable_logs = EmailLog.objects.filter(
        status='failed',
        retry_count__lt=3,
    ).select_related('student')[:50]

    retried = 0
    for log in retryable_logs:
        log.status = 'retrying'
        log.save(update_fields=['status'])

        success, _ = email_sending_service.send_email(
            student=log.student,
            email_type=log.email_type,
            log_id=log.id,
        )
        if success:
            retried += 1

    logger.info(f"Retried {retried}/{len(retryable_logs)} failed emails")
    return {'retried': retried}


def _notify_dashboard(email_type: str, student_name: str, success: bool, message: str):
    """Send real-time WebSocket notification to admin dashboard."""
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'email_notifications',
            {
                'type': 'email_notification',
                'data': {
                    'email_type': email_type,
                    'student_name': student_name,
                    'success': success,
                    'message': message,
                    'timestamp': timezone.now().isoformat(),
                }
            }
        )
    except Exception as e:
        logger.warning(f"WebSocket notification failed: {e}")
