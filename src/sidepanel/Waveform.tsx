export default function Waveform({
  active,
  onStart,
  onStop
}: {
  active: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  return (
    <div className="listen-wrap">
      <button
        className={`listen-btn ${active ? "is-listening" : ""}`}
        onClick={active ? onStop : onStart}
        aria-label={active ? "Stop listening" : "Identify music"}
      >
        {active && <span className="listen-ring" style={{ animationDelay: "0s" }} />}
        {active && <span className="listen-ring" style={{ animationDelay: "0.8s" }} />}
        {active && <span className="listen-ring" style={{ animationDelay: "1.6s" }} />}
        <span className="listen-btn-icon">♪</span>
      </button>
    </div>
  );
}
