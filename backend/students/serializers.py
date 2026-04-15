"""
Students Serializers — Email Automation System
"""
from rest_framework import serializers
from .models import Student


class StudentSerializer(serializers.ModelSerializer):
    is_review_upcoming = serializers.ReadOnlyField()
    email_count = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = '__all__'

    def get_email_count(self, obj):
        return obj.email_logs.count()


class StudentBulkSerializer(serializers.Serializer):
    """For CSV bulk import validation."""
    students = serializers.ListField(
        child=serializers.DictField()
    )
