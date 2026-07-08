from django.db import migrations


def unify_camera_movement_description(apps, schema_editor):
    CameraMovement = apps.get_model('content', 'CameraMovement')

    for camera in CameraMovement.objects.all().iterator():
        params = camera.movement_params if isinstance(camera.movement_params, dict) else {}
        description = str(params.get('description') or '').strip()
        raw_text = str(params.get('raw_text') or '').strip()

        next_params = dict(params)
        if description:
            next_params['description'] = description
        elif raw_text:
            next_params['description'] = raw_text
        else:
            next_params.pop('description', None)

        if 'raw_text' in next_params:
            next_params.pop('raw_text', None)

        if next_params != params:
            camera.movement_params = next_params
            camera.save(update_fields=['movement_params', 'updated_at'])


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(unify_camera_movement_description, migrations.RunPython.noop),
    ]
