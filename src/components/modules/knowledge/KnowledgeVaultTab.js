export default function KnowledgeVaultTab({ status, setActiveTab }) {
  return (
    <div className="card">
      <div className="empty-state">
        <div className="empty-state-icon">📖</div>
        <p className="empty-state-title">Brain Vault</p>
        <p className="empty-state-desc">
          {status?.stats?.documentsIngested
            ? `${status.stats.documentsIngested} documents in the vault. Use the search to query.`
            : "Your knowledge base is empty. Start by ingesting documentation or adding content in the Ingestion tab."}
        </p>
        {!status?.stats?.documentsIngested && (
          <button
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => setActiveTab("Ingestion")}
          >
            Start Ingesting
          </button>
        )}
      </div>
    </div>
  );
}
