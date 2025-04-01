import { useContext } from "react";
import { PlaygroundContext } from "../../../PlaygroundContext";
import { AI_MODELS } from "../../../services/AIService";

export default function ModelSelector() {
  const { currentModelId, setCurrentModelId } = useContext(PlaygroundContext);
  const { theme } = useContext(PlaygroundContext);
  return (
    // {/* AI 模型选择下拉框 */}
    <div
      className="model-selector-container"
      style={{
        position: "absolute",
        top: "10px",
        right: "20px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <label
        htmlFor="model-selector"
        style={{
          color: theme === "dark" ? "#fff" : "#333",
          fontSize: "14px",
        }}
      >
        AI 模型:
      </label>
      <select
        id="model-selector"
        value={currentModelId}
        onChange={(e) => setCurrentModelId(e.target.value)}
        style={{
          padding: "6px 10px",
          borderRadius: "4px",
          border: theme === "dark" ? "1px solid #555" : "1px solid #ccc",
          backgroundColor: theme === "dark" ? "#333" : "#fff",
          color: theme === "dark" ? "#fff" : "#333",
          fontSize: "14px",
          cursor: "pointer",
        }}
      >
        {AI_MODELS.map((model) => (
          <option key={model.id} value={model.id} title={model.description}>
            {model.name}
          </option>
        ))}
      </select>
    </div>
  );
}
