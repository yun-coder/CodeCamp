from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.content.models import CameraMovement, Storyboard
from apps.content.processors.image2video_stage import Image2VideoStageProcessor
from apps.projects.models import Project, Series


User = get_user_model()


class CameraMovementConsistencyTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='camera-user', password='secret123')
        self.client.force_authenticate(self.user)
        self.series = Series.objects.create(name='测试作品', description='测试', user=self.user)
        self.project = Project.objects.create(
            user=self.user,
            series=self.series,
            episode_number=1,
            sort_order=1,
            episode_title='第一集',
            name='第1集',
            original_topic='测试文案',
        )
        self.storyboard = Storyboard.objects.create(
            project=self.project,
            sequence_number=1,
            scene_description='主角走进房间',
            narration_text='主角进入房间',
            image_prompt='电影感室内场景',
        )

    def test_update_camera_movement_response_returns_description_only(self):
        camera = CameraMovement.objects.create(
            storyboard=self.storyboard,
            movement_type='zoom_in',
            movement_params={'description': '旧描述'},
        )

        response = self.client.patch(
            reverse('project-update-camera-movement', args=[self.project.id]),
            {
                'camera_id': str(camera.id),
                'movement_params': {'description': '新的运镜描述'},
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data['camera_movement']['movement_params'],
            {'description': '新的运镜描述'},
        )

        camera.refresh_from_db()
        self.assertEqual(camera.movement_params, {'description': '新的运镜描述'})

    def test_build_camera_movement_description_uses_description_only(self):
        CameraMovement.objects.create(
            storyboard=self.storyboard,
            movement_type='zoom_in',
            movement_params={'description': '镜头缓慢推近，保持主体居中'},
        )

        processor = Image2VideoStageProcessor()

        self.assertEqual(
            processor._build_camera_movement_description(self.project, 1),
            '镜头缓慢推近，保持主体居中',
        )
