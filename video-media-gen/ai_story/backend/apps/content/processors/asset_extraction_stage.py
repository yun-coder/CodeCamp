"""资产抽取阶段处理器。"""

import logging
import re
from typing import Any, Dict, List

from django.db import models
from django.utils import timezone

from apps.content.processors.llm_stage import LLMStageProcessor
from apps.projects.models import Project, ProjectStage
from apps.projects.utils import parse_json
from apps.prompts.models import GlobalVariable

logger = logging.getLogger(__name__)


class AssetExtractionStageProcessor(LLMStageProcessor):
    """基于项目文案抽取结构化资产。"""

    def __init__(self):
        super().__init__(stage_type='asset_extraction')

    def _get_input_data(self, project: Project, stage: ProjectStage) -> Dict[str, Any]:
        from apps.content.models import ContentRewrite

        try:
            rewrite = ContentRewrite.objects.get(project=project)
        except ContentRewrite.DoesNotExist:
            rewrite = None

        source_text = ''
        source_type = 'original_topic'
        if rewrite and (rewrite.rewritten_text or '').strip():
            source_text = rewrite.rewritten_text.strip()
            source_type = 'rewritten_text'
        elif rewrite and (rewrite.original_text or '').strip():
            source_text = rewrite.original_text.strip()
            source_type = 'original_text'
        else:
            source_text = (project.original_topic or '').strip()

        return {
            'raw_text': source_text,
            'source_text': source_text,
            'source_type': source_type,
            'human_text': '',
        }

    def _build_tasks(self, project: Project, input_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        return [{
            'user_prompt': input_data.get('source_text') or input_data.get('raw_text', '')
        }]

    def _save_result(
        self,
        project: Project,
        stage: ProjectStage,
        generated_text: str,
        prompt_used: str,
        metadata: Dict[str, Any]
    ) -> None:
        input_data = self._get_input_data(project, stage)
        parsed_output = self._normalize_output(project, generated_text)
        stage.output_data = {
            'source_text': input_data.get('source_text', ''),
            'source_type': input_data.get('source_type', 'original_topic'),
            'summary': parsed_output.get('summary', ''),
            'items': parsed_output.get('items', []),
            'raw_text': generated_text,
            'prompt_used': prompt_used,
            'generation_metadata': metadata,
            'updated_at': timezone.now().isoformat(),
        }
        stage.save(update_fields=['output_data'])

    def _normalize_output(self, project: Project, generated_text: str) -> Dict[str, Any]:
        data = parse_json(generated_text)
        if not isinstance(data, dict):
            data = {}

        raw_items = data.get('assets') or data.get('items') or []
        if not isinstance(raw_items, list):
            raw_items = []

        normalized_items = []
        for index, item in enumerate(raw_items, 1):
            if not isinstance(item, dict):
                continue

            key = self._normalize_key(item.get('key') or item.get('label') or f'asset_{index}')
            label = str(item.get('label') or key).strip() or key
            group = str(item.get('group') or '未分组').strip() or '未分组'
            variable_type = item.get('variable_type') or 'image'
            if variable_type not in {'string', 'number', 'boolean', 'json', 'image'}:
                variable_type = 'image'

            value = item.get('value')
            if value is None:
                value = item.get('content') or item.get('data') or ''
                if variable_type == 'json' and isinstance(value, str):
                    value = {'text': value}

            matches = self._find_candidates(project, key=key, label=label, group=group)
            normalized_items.append({
                'temp_id': f'item_{index}',
                'key': key,
                'label': label,
                'group': group,
                'variable_type': variable_type,
                'value': value,
                'confidence': self._normalize_confidence(item.get('confidence')),
                'match_status': 'matched' if matches else 'unmatched',
                'candidates': matches,
                'selected_asset_id': matches[0]['asset_id'] if len(matches) == 1 else None,
                'selected_action': None,
            })

        return {
            'summary': str(data.get('summary') or data.get('description') or '').strip(),
            'items': normalized_items,
        }

    def _find_candidates(self, project: Project, key: str, label: str, group: str) -> List[Dict[str, Any]]:
        query = GlobalVariable.objects.filter(is_active=True).filter(
            models.Q(created_by=project.user, scope='user') | models.Q(scope='system')
        )

        candidates: List[GlobalVariable] = []
        seen_ids = set()

        def append_assets(assets):
            for asset in assets:
                if asset.id in seen_ids:
                    continue
                seen_ids.add(asset.id)
                candidates.append(asset)
                if len(candidates) >= 3:
                    break

        append_assets(query.filter(key=key).order_by('scope', 'group', 'key')[:3])

        if len(candidates) < 3 and key:
            append_assets(query.filter(key__icontains=key)[:3])

        if len(candidates) < 3 and group:
            append_assets(query.filter(group__icontains=group)[:3])

        if len(candidates) < 3 and label:
            append_assets(query.filter(key__icontains=label)[:3])

        return [
            {
                'asset_id': str(asset.id),
                'key': asset.key,
                'group': asset.group,
                'description': asset.description,
                'variable_type': asset.variable_type,
                'scope': asset.scope,
                'scope_display': asset.get_scope_display(),
            }
            for asset in candidates[:3]
        ]

    def _normalize_key(self, value: str) -> str:
        text = str(value or '').strip().lower()
        text = re.sub(r'[^a-z0-9\u4e00-\u9fa5]+', '_', text)
        text = re.sub(r'_+', '_', text).strip('_')
        if not text:
            return 'asset_item'
        if re.match(r'^[0-9]', text):
            text = f'asset_{text}'
        return text[:100]

    def _normalize_confidence(self, value: Any) -> float:
        try:
            number = float(value)
        except (TypeError, ValueError):
            return 0.0
        if number < 0:
            return 0.0
        if number > 1:
            return 1.0
        return round(number, 4)

    def _get_ai_client(self, project: Project):
        return super()._get_ai_client(project)

    def _get_current_provider(self, project: Project):
        config = getattr(project, 'model_config', None)
        if config:
            providers = list(config.rewrite_providers.all())
            if providers:
                return providers[0]
        return super()._get_current_provider(project)

    def _get_max_tokens(self) -> int:
        return 4096

    def _get_temperature(self) -> float:
        return 0.3

    def _get_stage_display_name(self) -> str:
        return '资产抽取'
