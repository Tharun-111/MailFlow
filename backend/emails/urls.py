from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmailTemplateViewSet, EmailTriggerViewSet

router = DefaultRouter()
router.register(r'templates', EmailTemplateViewSet, basename='email-template')
router.register(r'trigger', EmailTriggerViewSet, basename='email-trigger')

urlpatterns = [path('', include(router.urls))]
