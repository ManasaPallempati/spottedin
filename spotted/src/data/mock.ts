import type { SpottedData } from "./adapter";
import { SEED_FITS, SEED_LISTINGS, SEED_ORDERS, SEED_SELLERS, SEED_THREADS } from "./seed";

export function createMockAdapter(): SpottedData {
  return {
    async listListings(filter) {
      let rows = SEED_LISTINGS.filter((l) => l.status === "live");
      if (filter?.category && filter.category !== "ALL") {
        rows = rows.filter((l) => l.category === filter.category);
      }
      if (filter?.query) {
        const q = filter.query.toLowerCase();
        rows = rows.filter(
          (l) =>
            l.title.toLowerCase().includes(q) ||
            l.brand.toLowerCase().includes(q) ||
            l.era.toLowerCase().includes(q),
        );
      }
      return rows;
    },
    async getListing(id) {
      return SEED_LISTINGS.find((l) => l.id === id) ?? null;
    },
    async getSeller(handle) {
      return SEED_SELLERS.find((s) => s.handle === handle) ?? null;
    },
    async listFits() {
      return SEED_FITS;
    },
    async listThreads() {
      return SEED_THREADS.map(({ messages: _messages, ...preview }) => preview);
    },
    async getThread(id) {
      return SEED_THREADS.find((t) => t.id === id) ?? null;
    },
    async getOrder(id) {
      return SEED_ORDERS.find((o) => o.id === id) ?? null;
    },
  };
}
