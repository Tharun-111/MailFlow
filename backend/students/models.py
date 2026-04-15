"""
Students Models — Email Automation System
Core data model for student/candidate management.
"""
from django.db import models
from django.utils import timezone


class Student(models.Model):
    """
    Represents a student or candidate in the system.
    Tracks review status, feedback, and communication preferences.
    """

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        ON_HOLD = 'on_hold', 'On Hold'
        SELECTED = 'selected', 'Selected'
        REJECTED = 'rejected', 'Rejected'
        COMPLETED = 'completed', 'Completed'

    # Core fields
    name = models.CharField(max_length=200)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    # Course / Track
    course = models.CharField(max_length=200, blank=True)
    batch = models.CharField(max_length=100, blank=True)
    mentor = models.CharField(max_length=200, blank=True)

    # Review info
    review_date = models.DateField(null=True, blank=True)
    review_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    feedback = models.TextField(blank=True)

    # AI-generated feedback (stored separately)
    ai_feedback = models.TextField(blank=True)

    # Task info
    task_title = models.CharField(max_length=300, blank=True)
    task_description = models.TextField(blank=True)
    task_due_date = models.DateField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['review_date']),
            models.Index(fields=['email']),
        ]

    def __str__(self):
        return f"{self.name} ({self.email})"

    @property
    def is_review_upcoming(self):
        """Returns True if review is within next 3 days."""
        if not self.review_date:
            return False
        days_until = (self.review_date - timezone.now().date()).days
        return 0 <= days_until <= 3
