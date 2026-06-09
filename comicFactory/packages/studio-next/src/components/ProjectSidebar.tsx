import type { Project } from '../types';

interface Props {
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function ProjectSidebar({ projects, selectedId, onSelect, onNew, onDelete }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <h2>图集项目</h2>
        <button className="new-btn" onClick={onNew}>
          + 新建
        </button>
      </div>
      <div className="project-list">
        {projects.length === 0 && <div className="empty-list">还没有项目，点击 + 新建。</div>}
        {projects.map((p) => (
          <div key={p.id} className={`project-row ${p.id === selectedId ? 'active' : ''}`} onClick={() => onSelect(p.id)}>
            <span className="name">{p.name}</span>
            <button
              className="del-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('确定删除这个图集项目？')) onDelete(p.id);
              }}
            >
              x
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
