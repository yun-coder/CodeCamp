from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.content.models import CameraMovement, GeneratedImage, GeneratedVideo, Storyboard
from apps.projects.models import Project, Series
from apps.projects.tasks import generate_jianying_draft


User = get_user_model()


class JianyingDraftTaskTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='draft-user', password='secret123')
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
            scene_description='测试场景',
            narration_text='这是一段旁白',
            image_prompt='一只猫走在街上',
        )
        self.image = GeneratedImage.objects.create(
            storyboard=self.storyboard,
            image_url='http://example.com/image.jpg',
            thumbnail_url='http://example.com/image-thumb.jpg',
            status='completed',
        )
        self.camera_movement = CameraMovement.objects.create(
            storyboard=self.storyboard,
            movement_type='static',
        )

    @patch('apps.projects.tasks.JianyingDraftGenerator.generate_from_project_data')
    def test_generate_draft_uses_generated_video_instead_of_stage_output_data(self, mock_generate):
        mock_generate.return_value = '/tmp/jianying-draft'

        GeneratedVideo.objects.create(
            storyboard=self.storyboard,
            image=self.image,
            camera_movement=self.camera_movement,
            video_url='http://example.com/video.mp4',
            thumbnail_url='http://example.com/video-thumb.jpg',
            status='completed',
            duration=3.5,
            width=1080,
            height=1920,
            fps=24,
            file_size=1024,
        )

        result = generate_jianying_draft.apply(
            kwargs={
                'project_id': str(self.project.id),
                'user_id': self.user.id,
            }
        ).get()

        self.assertTrue(result['success'])
        self.assertEqual(result['draft_path'], '/tmp/jianying-draft')
        mock_generate.assert_called_once()

        _, kwargs = mock_generate.call_args
        self.assertEqual(kwargs['project_name'], f'{self.project.name}_{self.project.id}')
        self.assertEqual(
            kwargs['scenes'],
            [
                {
                    'scene_number': 1,
                    'video_urls': ['http://example.com/video.mp4'],
                    'narration': '这是一段旁白',
                    'narration_text': '这是一段旁白',
                }
            ]
        )

        self.project.refresh_from_db()
        self.assertEqual(self.project.jianying_draft_path, '/tmp/jianying-draft')
