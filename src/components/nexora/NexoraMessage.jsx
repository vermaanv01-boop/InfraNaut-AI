import NexoraAvatar from './NexoraAvatar'
import ReactMarkdown from 'react-markdown'

export default function NexoraMessage({ content, timestamp, isStreaming = false }) {
  return (
    <div className="flex gap-3 animate-fade-in-up">
      <NexoraAvatar size={36} glow={isStreaming} />
      <div className="flex flex-col gap-1 max-w-[80%]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-teal-400">Nexora</span>
          <span className="text-[10px] text-slate-500">AI Assistant</span>
          {timestamp && (
            <span className="text-[10px] text-slate-600 ml-auto">
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="nexora-message p-3 text-sm text-slate-200 leading-relaxed">
          {isStreaming && !content ? (
            <div className="flex gap-1 py-1">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          ) : (
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-slate-300">{children}</li>,
                strong: ({ children }) => <strong className="text-teal-300 font-semibold">{children}</strong>,
                code: ({ children }) => <code className="bg-slate-800 px-1.5 py-0.5 rounded font-mono text-xs text-amber-300">{children}</code>,
                h3: ({ children }) => <h3 className="text-teal-400 font-semibold text-sm mb-1">{children}</h3>,
              }}
            >
              {content}
            </ReactMarkdown>
          )}
          {isStreaming && content && (
            <span className="inline-block w-0.5 h-3.5 bg-teal-400 animate-pulse ml-0.5 align-middle" />
          )}
        </div>
      </div>
    </div>
  )
}
