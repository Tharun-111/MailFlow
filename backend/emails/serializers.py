from rest_framework import serializers
from .models import EmailTemplate, EmailLog


class EmailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailTemplate
        fields = '__all__'


class EmailLogSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_email = serializers.CharField(source='student.email', read_only=True)

    class Meta:
        model = EmailLog
        fields = '__all__'


class TriggerEmailSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()
    email_type = serializers.ChoiceField(choices=EmailTemplate.EmailType.choices)
    extra_context = serializers.DictField(required=False, default={})
    attach_pdf = serializers.ChoiceField(
        choices=['offer_letter', 'certificate', 'task_sheet', ''],
        required=False,
        allow_blank=True
    )
