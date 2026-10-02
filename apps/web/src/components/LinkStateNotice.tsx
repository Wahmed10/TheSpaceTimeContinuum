'use client';
import { useEngineStore } from '../engine-bridge/useEngineStore';

export default function LinkStateNotice() {
  const issues = useEngineStore((state) => state.linkIssues);
  if (!issues.length) return null;
  return (
    <aside className="link-state-notice" aria-label="Link settings">
      <p role="status">Some link settings could not be restored.</p>
      <details>
        <summary>Review link settings</summary>
        <ul>
          {issues.map((issue, index) => (
            <li key={`${issue.field}-${index}`}>{issue.message}</li>
          ))}
        </ul>
      </details>
    </aside>
  );
}
