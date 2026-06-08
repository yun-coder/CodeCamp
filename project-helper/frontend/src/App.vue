<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'
import python from 'highlight.js/lib/languages/python'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'
import {
  Bot,
  BrainCircuit,
  Check,
  CheckCircle2,
  Clock3,
  Code2,
  Database,
  Download,
  Eye,
  EyeOff,
  FolderGit2,
  Loader2,
  MessageSquareText,
  Play,
  RefreshCw,
  Search,
  Send,
  Settings,
  Sparkles,
  TerminalSquare,
  Trash2,
} from 'lucide-vue-next'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

hljs.registerLanguage('bash', bash)
hljs.registerLanguage('css', css)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('md', markdown)
hljs.registerLanguage('python', python)
hljs.registerLanguage('py', python)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('yml', yaml)

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderCode(code, lang) {
  if (lang && hljs.getLanguage(lang)) {
    const highlighted = hljs.highlight(code, { language: lang }).value
    return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`
  }
  return `<pre><code class="hljs">${escapeHtml(code)}</code></pre>`
}

const repoUrl = ref('https://github.com/tiangolo/fastapi')
const loading = ref(false)
const progress = ref([])
const report = ref('')
const currentProject = ref(null)
const pendingProject = ref(null)
const projects = ref([])
const question = ref('这个项目的启动入口在哪里？')
const answer = ref('')
const chatting = ref(false)
const error = ref('')
const showSettings = ref(false)
const apiKey = ref('')
const configMsg = ref(null)
const configLoading = ref(false)
const showKey = ref(false)
const reportEl = ref(null)
const answerEl = ref(null)

const renderer = new marked.Renderer()
renderer.code = ({ text, lang }) => {
  return renderCode(text, lang)
}

marked.setOptions({
  renderer,
  gfm: true,
  breaks: true,
})

marked.use({
  extensions: [{
    name: 'code',
    renderer(token) {
      const code = token.text || ''
      const lang = token.lang || ''
      return renderCode(code, lang)
    },
  }],
})

const renderedReport = computed(() => marked.parse(report.value || ''))
const renderedAnswer = computed(() => marked.parse(answer.value || ''))
const reportFileName = computed(() => {
  const repoName = currentProject.value?.repo_name
    || pendingProject.value?.repo_name
    || repoUrl.value.trim().split('/').filter(Boolean).pop()
    || 'project-report'
  return `${repoName.replace(/[\\/:*?"<>|]+/g, '-')}-analysis-report.md`
})

watch(report, (value) => {
  if (value) {
    loading.value = false
    pendingProject.value = null
  }
})

function pushProgress(message, kind = 'progress') {
  progress.value.push({
    id: `${Date.now()}-${Math.random()}`,
    message,
    kind,
    time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
  })
}

function apiErrorMessage(err) {
  if (err instanceof TypeError && err.message === 'Failed to fetch') {
    return `无法连接后端服务，请先启动 ${API_BASE}`
  }
  return err?.message || '请求失败'
}

async function refreshProjects() {
  const res = await fetch(`${API_BASE}/api/projects`)
  projects.value = await res.json()
}

async function loadProject(id) {
  const res = await fetch(`${API_BASE}/api/projects/${id}`)
  if (!res.ok) return
  const data = await res.json()
  currentProject.value = data
  report.value = data.report_md || ''
  progress.value = []
  pushProgress(`已载入缓存项目：${data.repo_name}`, 'done')
  await nextTick()
  reportEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function deleteProject(item) {
  if (!item?.id) return
  try {
    const res = await fetch(`${API_BASE}/api/projects/${item.id}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || '删除缓存失败')
    }
    projects.value = projects.value.filter((project) => project.id !== item.id)
    if (currentProject.value?.id === item.id) {
      currentProject.value = null
      pendingProject.value = null
      report.value = ''
      answer.value = ''
      progress.value = []
    }
    pushProgress(`已删除缓存项目：${item.repo_name}`, 'done')
  } catch (err) {
    error.value = apiErrorMessage(err)
    pushProgress(error.value, 'error')
  }
}

function downloadReport() {
  if (!report.value) return
  const blob = new Blob([report.value], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = reportFileName.value
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

async function analyze() {
  if (!repoUrl.value.trim()) return
  loading.value = true
  error.value = ''
  report.value = ''
  answer.value = ''
  currentProject.value = null
  pendingProject.value = null
  progress.value = []
  pushProgress('提交分析任务')
  try {
    const res = await fetch(`${API_BASE}/api/projects/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo_url: repoUrl.value.trim(), force: true }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || '分析请求失败')
    if (data.cached) {
      currentProject.value = { id: data.project_id }
      pendingProject.value = null
      report.value = data.report_md || ''
      pushProgress('命中缓存，无需重复分析', 'done')
      await refreshProjects()
      return
    }
    const source = new EventSource(`${API_BASE}/api/jobs/${data.job_id}/events`)
    source.addEventListener('progress', (event) => {
      const payload = JSON.parse(event.data)
      pushProgress(payload.message)
    })
    source.addEventListener('project', (event) => {
      const payload = JSON.parse(event.data)
      pendingProject.value = { id: payload.project_id, repo_name: payload.repo_name }
      pushProgress(payload.message)
    })
    source.addEventListener('done', async (event) => {
      const payload = JSON.parse(event.data)
      report.value = payload.report_md || ''
      currentProject.value = { id: payload.project_id }
      pendingProject.value = null
      pushProgress(payload.message, 'done')
      loading.value = false
      source.close()
      await refreshProjects()
      await nextTick()
      reportEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    source.addEventListener('error', (event) => {
      try {
        const payload = JSON.parse(event.data)
        error.value = payload.message || '分析失败'
      } catch {
        error.value = '分析连接中断'
      }
      pushProgress(error.value, 'error')
      loading.value = false
      source.close()
    })
  } catch (err) {
    error.value = apiErrorMessage(err)
    pushProgress(error.value, 'error')
  } finally {
    if (!progress.value.some((item) => item.kind === 'progress') || report.value) {
      loading.value = false
    }
  }
}

function parseSse(buffer, onEvent) {
  const parts = buffer.split('\n\n')
  const rest = parts.pop() || ''
  for (const part of parts) {
    const lines = part.split('\n')
    const eventLine = lines.find((line) => line.startsWith('event:'))
    const dataLine = lines.find((line) => line.startsWith('data:'))
    if (!dataLine) continue
    onEvent({
      event: eventLine ? eventLine.slice(6).trim() : 'message',
      data: JSON.parse(dataLine.slice(5).trim()),
    })
  }
  return rest
}

async function ask() {
  if (!currentProject.value?.id || !question.value.trim()) return
  chatting.value = true
  answer.value = ''
  error.value = ''
  try {
    const res = await fetch(`${API_BASE}/api/projects/${currentProject.value.id}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: question.value.trim() }),
    })
    if (!res.ok || !res.body) throw new Error('问答请求失败')
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      buffer = parseSse(buffer, ({ event, data }) => {
        if (event === 'token') answer.value += data.delta
      })
      await nextTick()
      answerEl.value?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    chatting.value = false
  }
}

async function loadConfig() {
  try {
    const res = await fetch(`${API_BASE}/api/config`)
    if (res.ok) {
      const data = await res.json()
      apiKey.value = data.has_api_key ? '••••••••' : ''
    }
  } catch { /* backend may not be ready */ }
}

async function saveConfig() {
  configMsg.value = null
  configLoading.value = true
  try {
    const res = await fetch(`${API_BASE}/api/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deepseek_api_key: apiKey.value }),
    })
    if (!res.ok) throw new Error('保存失败')
    configMsg.value = { kind: 'success', text: '已保存。重启应用后生效。' }
  } catch (err) {
    configMsg.value = { kind: 'error', text: apiErrorMessage(err) }
  } finally {
    configLoading.value = false
  }
}

onMounted(() => {
  refreshProjects().catch((err) => {
    error.value = apiErrorMessage(err)
  })
  loadConfig()
})
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark"><BrainCircuit :size="22" /></div>
        <div>
          <strong>project-helper</strong>
          <span>项目学习助手</span>
        </div>
      </div>

      <button class="ghost-button" type="button" @click="refreshProjects">
        <RefreshCw :size="16" />
        刷新缓存
      </button>

      <div class="cache-list">
        <p class="eyebrow">已分析项目</p>
        <div
          v-for="item in projects"
          :key="item.id"
          class="cache-row"
        >
          <button class="cache-item" type="button" @click="loadProject(item.id)">
            <FolderGit2 :size="16" />
            <span>{{ item.repo_name }}</span>
            <small>{{ item.status }}</small>
          </button>
          <button class="cache-delete" type="button" title="删除缓存" @click="deleteProject(item)">
            <Trash2 :size="15" />
          </button>
        </div>

        <hr class="sidebar-divider" />
        <button class="ghost-button" type="button" @click="showSettings = true; loadConfig()">
          <Settings :size="16" />
          设置
        </button>
      </div>
    </aside>

    <main class="workspace">
      <section class="topbar">
        <div>
          <p class="eyebrow">GitHub Repository Intelligence</p>
          <h1>把陌生源码讲到能上手改</h1>
        </div>
        <div class="status-pill">
          <Database :size="16" />
          SQLite 缓存
        </div>
      </section>

      <section class="analysis-panel">
        <div class="input-row">
          <label class="repo-input">
            <Search :size="18" />
            <input v-model="repoUrl" type="url" placeholder="https://github.com/owner/repo" />
          </label>
          <button class="primary-button" type="button" :disabled="loading" @click="analyze">
            <Loader2 v-if="loading" class="spin" :size="18" />
            <Play v-else :size="18" />
            {{ loading ? '分析中' : '开始分析' }}
          </button>
        </div>

        <div v-if="error" class="error-box">{{ error }}</div>

        <div class="progress-grid">
          <article class="metric">
            <Code2 :size="20" />
            <strong>源码扫描</strong>
            <span>目录、依赖、入口、关键文件</span>
          </article>
          <article class="metric">
            <Sparkles :size="20" />
            <strong>AI 报告</strong>
            <span>通俗解释架构与数据流</span>
          </article>
          <article class="metric">
            <MessageSquareText :size="20" />
            <strong>交互问答</strong>
            <span>边查代码边流式回答</span>
          </article>
        </div>

        <div class="timeline">
          <div v-for="item in progress" :key="item.id" class="timeline-item" :class="item.kind">
            <CheckCircle2 v-if="item.kind === 'done'" :size="16" />
            <Clock3 v-else :size="16" />
            <span>{{ item.time }}</span>
            <p>{{ item.message }}</p>
          </div>
        </div>
      </section>

      <section ref="reportEl" class="content-grid">
        <article class="reader">
          <div class="section-header">
            <div class="section-title">
              <TerminalSquare :size="20" />
              <h2>完整分析报告</h2>
            </div>
            <button
              class="icon-button"
              type="button"
              title="下载报告"
              :disabled="!report"
              @click="downloadReport"
            >
              <Download :size="17" />
            </button>
          </div>
          <div v-if="report" class="markdown-body" v-html="renderedReport"></div>
          <div v-else class="empty-state">
            输入 GitHub 仓库地址后，这里会生成项目概述、技术栈、目录结构、核心模块、数据流、设计模式和阅读路线。
          </div>
        </article>

        <aside class="chat-panel">
          <div class="section-title">
            <Bot :size="20" />
            <h2>源码问答</h2>
          </div>
          <textarea v-model="question" :disabled="!currentProject?.id || !report" />
          <button class="primary-button full" type="button" :disabled="chatting || !currentProject?.id || !report" @click="ask">
            <Loader2 v-if="chatting" class="spin" :size="18" />
            <Send v-else :size="18" />
            {{ chatting ? '回答中' : '提问' }}
          </button>
          <div ref="answerEl" class="answer-box">
            <div v-if="answer" class="markdown-body compact" v-html="renderedAnswer"></div>
            <p v-else>分析完成后，可以问“入口在哪里”“某个模块怎么读”“请求数据怎么流动”。</p>
          </div>
        </aside>
      </section>
    </main>
    </main>

    <!-- Settings Modal -->
    <Teleport to="body">
      <div v-if="showSettings" class="modal-overlay" @click.self="showSettings = false">
        <div class="modal-panel">
          <h3><Settings :size="20" /> 设置</h3>
          <label>
            DeepSeek API Key
            <div class="key-row">
              <input
                v-model="apiKey"
                :type="apiKey === '••••••••' || showKey ? 'text' : 'password'"
                placeholder="sk-..."
              />
              <button type="button" class="icon-button" @click="showKey = !showKey">
                <Eye v-if="!showKey" :size="16" />
                <EyeOff v-else :size="16" />
              </button>
            </div>
          </label>
          <button class="primary-button full" type="button" :disabled="configLoading" @click="saveConfig">
            <Loader2 v-if="configLoading" class="spin" :size="16" />
            <Check v-else :size="16" />
            保存
          </button>
          <p v-if="configMsg" :class="configMsg.kind">{{ configMsg.text }}</p>
        </div>
      </div>
    </Teleport>
  </div>
</template>
