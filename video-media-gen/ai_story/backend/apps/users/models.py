"""用户管理模型。"""

from django.conf import settings
from django.db import models


class UserPreference(models.Model):
    """用户偏好配置。"""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='preferences',
        verbose_name='用户',
    )
    key = models.CharField('偏好键', max_length=128)
    value = models.CharField('偏好值', max_length=255, blank=True, default='')
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        db_table = 'user_preferences'
        verbose_name = '用户偏好'
        verbose_name_plural = '用户偏好'
        constraints = [
            models.UniqueConstraint(fields=['user', 'key'], name='unique_user_preference_key')
        ]
        indexes = [
            models.Index(fields=['user', 'key']),
        ]

    def __str__(self):
        return f'{self.user_id}:{self.key}'
