const createSuggestion = (action, label, params = {}, description = '') => ({
  id: `${action}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  action,
  label,
  params,
  description,
});

const includesAny = (text, keywords = []) => keywords.some((item) => text.includes(item));

const buildProjectSummary = (context) => {
  const { stats = {}, entities = {}, summary = '' } = context;
  const stageProgress = `${stats.completedStages || 0}/${stats.totalStages || 0}`;
  const pieces = [
    summary,
    `当前阶段完成度 ${stageProgress}`,
    `分镜 ${stats.storyboardCount || 0} 个`,
  ];

  if (stats.failedStages) {
    pieces.push(`失败阶段 ${stats.failedStages} 个`);
  }
  if (entities.processingStage) {
    pieces.push(`正在执行 ${entities.processingStage}`);
  }

  return `${pieces.filter(Boolean).join('，')}。`;
};

const buildProjectNextStep = (context) => {
  const { entities = {}, stats = {} } = context;
  const suggestions = [];

  if (entities.projectStatus === 'processing') {
    suggestions.push('当前流程仍在执行，建议先观察处理中的阶段，避免重复触发。');
  } else if (stats.failedStages > 0) {
    suggestions.push('当前有失败阶段，建议先定位失败节点，再决定是局部重试还是继续微调。');
  } else if ((stats.storyboardCount || 0) === 0) {
    suggestions.push('分镜还未生成，建议优先推进到分镜阶段。');
  } else if ((stats.cameraReadyCount || 0) === 0) {
    suggestions.push('已有分镜但运镜内容不足，可以先补一次运镜生成或进入微调。');
  } else {
    suggestions.push('当前流程基础数据已经具备，可以继续推进视频生成，或先做局部内容优化。');
  }

  return suggestions.join(' ');
};

const buildProjectSuggestions = (context, prompt) => {
  const { entities = {}, stats = {} } = context;
  const suggestionList = [];

  if (includesAny(prompt, ['分镜', '定位'])) {
    suggestionList.push(createSuggestion('focus_stage', '定位到分镜阶段', { stageType: 'storyboard' }, '滚动到分镜区域。'));
  }

  if (includesAny(prompt, ['微调', '修改', '优化', '分镜']) && entities.firstStoryboardId) {
    suggestionList.push(createSuggestion('open_storyboard_chat', '打开分镜微调助手', { storyboardId: entities.firstStoryboardId }, '直接打开第一个分镜的聊天微调入口。'));
  }

  if (includesAny(prompt, ['运镜', '镜头']) && entities.firstCameraId && entities.firstCameraStoryboardId) {
    suggestionList.push(createSuggestion('open_camera_chat', '打开运镜微调助手', {
      cameraId: entities.firstCameraId,
      storyboardId: entities.firstCameraStoryboardId,
    }, '针对首个已有运镜数据的分镜进行微调。'));
  }

  if (includesAny(prompt, ['运行', '开始', '执行']) && entities.projectStatus !== 'processing') {
    suggestionList.push(createSuggestion('run_pipeline', '运行完整流程', {}, '触发当前分集的完整流程。'));
  }

  if (includesAny(prompt, ['暂停']) && entities.projectStatus === 'processing') {
    suggestionList.push(createSuggestion('pause_pipeline', '暂停当前流程', {}, '暂停项目级流程执行。'));
  }

  if (includesAny(prompt, ['恢复', '继续']) && entities.projectStatus === 'paused') {
    suggestionList.push(createSuggestion('resume_pipeline', '恢复当前流程', {}, '从暂停状态恢复项目流程。'));
  }

  if (!suggestionList.length) {
    if (stats.storyboardCount > 0) {
      suggestionList.push(createSuggestion('focus_stage', '先看分镜区域', { stageType: 'storyboard' }, '定位到当前分镜内容。'));
    }
    if (entities.projectStatus === 'paused') {
      suggestionList.push(createSuggestion('resume_pipeline', '恢复流程', {}, '继续当前项目流程。'));
    } else if (entities.projectStatus !== 'processing') {
      suggestionList.push(createSuggestion('run_pipeline', '运行流程', {}, '从当前状态继续推进。'));
    }
  }

  return suggestionList.slice(0, 3);
};

export const generateLocalAssistantResponse = async ({ context, prompt }) => {
  const normalizedPrompt = String(prompt || '').trim();

  if (!normalizedPrompt) {
    return {
      content: '可以直接告诉我你想总结进度、定位某个阶段，还是触发当前页面内的一个操作。',
      suggestions: [],
    };
  }

  if (context?.pageType === 'project_detail') {
    let content = buildProjectSummary(context);

    if (includesAny(normalizedPrompt, ['下一步', '建议', '怎么做'])) {
      content = buildProjectNextStep(context);
    } else if (includesAny(normalizedPrompt, ['总结', '进度', '现状', '现在'])) {
      content = buildProjectSummary(context);
    } else if (includesAny(normalizedPrompt, ['分镜', '运镜', '修改', '微调'])) {
      content = `${buildProjectSummary(context)} 你可以先定位到相关区域，再进入节点微调。`;
    } else if (includesAny(normalizedPrompt, ['运行', '暂停', '恢复'])) {
      content = `${buildProjectSummary(context)} 我已经根据当前状态整理出可执行动作。`;
    }

    return {
      content,
      suggestions: buildProjectSuggestions(context, normalizedPrompt),
    };
  }

  return {
    content: `${context?.summary || '我已读取当前页面。'} 这版助手已支持项目详情页的上下文分析和页面动作，其他页面会先提供解释与导航建议。`,
    suggestions: [],
  };
};
