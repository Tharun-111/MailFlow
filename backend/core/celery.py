"""
Celery Configuration — Email Automation System
Handles background tasks and scheduled jobs.
"""
import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

app = Celery('email_automation')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# ─── Periodic Task Schedule (Celery Beat) ──────────────────────────────────
app.conf.beat_schedule = {
    # Weekly schedule email — every Sunday at 8 AM IST
    'weekly-schedule-email': {
        'task': 'emails.tasks.send_weekly_schedule_emails',
        'schedule': crontab(hour=8, minute=0, day_of_week='sunday'),
    },
    # Review reminder — daily at 9 AM, checks upcoming reviews
    'review-reminder-check': {
        'task': 'emails.tasks.send_review_reminders',
        'schedule': crontab(hour=9, minute=0),
    },
    # Retry failed emails — every 2 hours
    'retry-failed-emails': {
        'task': 'emails.tasks.retry_failed_emails',
        'schedule': crontab(minute=0, hour='*/2'),
    },
}

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
