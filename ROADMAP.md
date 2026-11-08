# Nestwell roadmap

The current build is a seeded demo with browser speech recognition and an optional
Mapbox map. These are follow-on projects, not current capabilities.

1. **Real property feeds:** licensed UK feed agreements, import jobs, deduplication,
   provenance, withdrawals, image rights and consistent sale/rental pricing periods.
2. **Verified authentication and agent portal:** replace demo credentials, add
   verified email/OAuth, account recovery, agent roles, listing management,
   enquiry inbox, audit trails and retention controls.
3. **UK postcode geocoding:** licensed postcode/address lookup, canonical location
   IDs and PostGIS distance queries; remove seeded coordinate centroids and
   normalize cities for indexed case-insensitive matching at feed scale.
4. **Semantic search:** embeddings, vocabulary evaluation, negative preferences,
   retrieval/reranking quality datasets and measured confidence calibration.
5. **Saved-search email alerts:** explicit opt-in, delivery jobs, unsubscribes,
   notification preferences and email provider integration.
6. **Mortgage calculator:** editable deposit/rate/term assumptions, repayment
   estimates and clear limitations; no personalized lending advice.
7. **Deployment and scale:** stable auth secret, verified provider, shared Redis
   rate limits/cache coordination, query-log retention, observability, backups,
   distributed tracing and an isolated test database in CI.
8. **Voice coverage:** real-device Chrome/Edge/Safari matrix, assistive-technology
   testing and an opt-in backend STT fallback with explicit recording controls.
9. **Internationalization:** locale-aware UI, currencies and search evaluation;
   keep the current UK/GBP assumptions explicit until each locale is supported.
10. **Dark mode:** accessible theme tokens, map styling, reduced-motion checks
    and a full contrast/screenshot regression matrix.
