export default function UserMessage({ content, timestamp, username }) {
  const initials = username ? username.slice(0, 2).toUpperCase() : 'U'
  return (
    <div className="flex gap-3 justify-end animate-fade-in-up">
      <div className="flex flex-col gap-1 items-end max-w-[80%]">
        <div className="flex items-center gap-2 mb-1">
          {timestamp && (
            <span className="text-[10px] text-slate-600">
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <span className="text-xs font-semibold text-slate-400">{username || 'You'}</span>
        </div>
        <div className="user-message p-3 text-sm text-slate-200 leading-relaxed">
          {content}
        </div>
      </div>
      <div
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
        style={{ background: 'linear-gradient(135deg, #1e3a5f, #334155)' }}
      >
        {initials}
      </div>
    </div>
  )
}
