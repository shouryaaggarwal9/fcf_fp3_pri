"use client";

import { useState, useMemo } from "react";
import { initialItems, StoreItem } from "@/data/items";
import { useWebUSB } from "@/hooks/useWeb";
import { generateTSPL } from "@/utils/tspl";

interface QueueItem extends StoreItem {
  quantity: number;
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [queue, setQueue] = useState<QueueItem[]>([]);

  // States for "Add Label" Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customWeight, setCustomWeight] = useState("");
  const [customMrp, setCustomMrp] = useState("");
  const [customShelf, setCustomShelf] = useState("2"); // Default 2 months

  const { device, isPrinting, error, connect, print } = useWebUSB();

  // --- SMART SEARCH LOGIC ---
  // --- ADVANCED POS SMART SEARCH LOGIC ---
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return [];

    // Clean input: "ard 5" -> "ard5"
    const q = searchQuery.toLowerCase().replace(/\s+/g, "");

    const scoredResults = initialItems.map((item) => {
      const name = item.name.toLowerCase();
      const weight = item.weight.toString();
      const weightKg =
        item.weight >= 1000 ? (item.weight / 1000).toString() : "";

      // 1. Create initials (e.g., "ARHAR DAL" -> "ad")
      const initials = name
        .split(" ")
        .map((w) => w[0])
        .join("");

      // 2. Create continuous search strings
      const exactString = name.replace(/\s+/g, "") + weight; // "arhardal500"
      const exactStringKg = weightKg ? name.replace(/\s+/g, "") + weightKg : ""; // "moongdhuli1"
      const initialsString = initials + weight; // "ad500"
      const initialsStringKg = weightKg ? initials + weightKg : ""; // "md1"

      let score = 0;

      // RULE 1: Direct Acronym Match (Highest Priority - Score: 100)
      // Matches "ad500" -> ARHAR DAL 500g
      if (
        initialsString.startsWith(q) ||
        (initialsStringKg && initialsStringKg.startsWith(q))
      ) {
        score += 100;
      } else if (
        initialsString.includes(q) ||
        (initialsStringKg && initialsStringKg.includes(q))
      ) {
        score += 80;
      }

      // RULE 2: Continuous Substring Match (Score: 75)
      // Matches "dal500" -> ARHAR DAL 500g
      if (
        exactString.includes(q) ||
        (exactStringKg && exactStringKg.includes(q))
      ) {
        score += 75;
      }

      // RULE 3: POS Subsequence Match (Score: 10 to 50)
      // Matches "ard5" -> A(rhar) D(al) 5(00)
      // Checks if the characters typed appear in the correct chronological order
      if (score === 0) {
        let searchIdx = 0;
        let matchScore = 50; // Start with decent score, degrade if letters are far apart

        for (let i = 0; i < exactString.length; i++) {
          if (exactString[i] === q[searchIdx]) {
            searchIdx++;
          } else {
            matchScore -= 1; // Penalize for gaps between matched letters
          }

          if (searchIdx === q.length) {
            score += Math.max(10, matchScore); // Ensure it gets at least 10 points
            break;
          }
        }
      }

      return { item, score };
    });

    // Filter out 0 scores, sort by highest score, return top 5
    return scoredResults
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((result) => result.item)
      .slice(0, 5);
  }, [searchQuery]);
  // --- QUEUE MANAGEMENT ---
  const addToQueue = (item: StoreItem) => {
    setQueue((prev) => {
      const existing = prev.find((q) => q.id === item.id);
      if (existing) {
        return prev.map((q) =>
          q.id === item.id ? { ...q, quantity: q.quantity + 1 } : q,
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    setSearchQuery("");
  };

  const updateQuantity = (id: string, delta: number) => {
    setQueue((prev) =>
      prev.map((q) => {
        if (q.id === id) {
          return { ...q, quantity: Math.max(1, q.quantity + delta) };
        }
        return q;
      }),
    );
  };

  const removeItem = (id: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  };

  // --- ADD CUSTOM LABEL ---
  const handleAddCustomLabel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName || !customWeight || !customMrp) return;

    const newItem: StoreItem = {
      id: `CUSTOM_${Date.now()}`,
      name: customName.toUpperCase(),
      weight: parseInt(customWeight),
      mrp: parseInt(customMrp),
      shelfLife: parseInt(customShelf),
    };

    addToQueue(newItem);
    setIsModalOpen(false);

    // Reset form
    setCustomName("");
    setCustomWeight("");
    setCustomMrp("");
    setCustomShelf("2");
  };

  // --- HARDWARE PRINTING ---
  const handlePrint = async () => {
    if (!device) {
      await connect();
      return;
    }
    const tsplData = generateTSPL(queue);
    await print(tsplData);
  };

  const totalLabels = queue.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-col min-h-full relative">
      {/* Top Section: Search Bar & Add Button */}
      <div className="p-4 shrink-0 bg-white z-30 relative shadow-sm">
        <div className="flex gap-2 relative">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search items (e.g. DAL 500)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 bg-slate-50 rounded-lg border border-slate-300 w-full px-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 font-medium"
            />
            {filteredItems.length > 0 && (
              <div className="absolute top-14 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden z-40">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addToQueue(item)}
                    className="w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 flex justify-between items-center last:border-0"
                  >
                    <div>
                      <div className="font-bold text-slate-800">
                        {item.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {item.weight >= 1000
                          ? `${item.weight / 1000}Kg`
                          : `${item.weight}g`}{" "}
                        • ₹{item.mrp}
                      </div>
                    </div>
                    <div className="text-blue-600 bg-blue-50 px-3 py-1 rounded text-sm font-bold">
                      Add
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Add Label Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-12 h-12 bg-slate-900 text-white rounded-lg flex items-center justify-center shrink-0 hover:bg-slate-800 active:scale-95 transition-all shadow-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* Middle Section: Queue List */}
      <div className="flex-1 bg-slate-50 p-4 pb-32 overflow-y-auto">
        {queue.length === 0 ? (
          <p className="text-center text-sm text-slate-400 mt-10 font-medium">
            Queue is empty
          </p>
        ) : (
          <div className="space-y-4">
            {queue.map((item) => (
              <div
                key={item.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800 leading-tight text-lg">
                      {item.name}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {item.weight >= 1000
                        ? `${item.weight / 1000}Kg`
                        : `${item.weight}g`}{" "}
                      • MRP: ₹{item.mrp}
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-red-400 p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                    Quantity
                  </span>
                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 border border-slate-200">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-10 h-10 flex items-center justify-center bg-white rounded-md shadow-sm text-slate-700 hover:bg-slate-50 font-bold text-xl active:scale-95 transition-transform"
                    >
                      -
                    </button>
                    <span className="w-10 text-center font-bold text-slate-800 text-lg">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-10 h-10 flex items-center justify-center bg-white rounded-md shadow-sm text-slate-700 hover:bg-slate-50 font-bold text-xl active:scale-95 transition-transform"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.05)] z-20 flex flex-col gap-2">
        {error && (
          <p className="text-red-500 text-xs font-bold text-center mb-1">
            {error}
          </p>
        )}
        <button
          onClick={handlePrint}
          disabled={totalLabels === 0 || isPrinting}
          className="w-full bg-blue-600 disabled:bg-slate-300 text-white font-bold text-lg rounded-xl py-4 shadow-md hover:bg-blue-700 disabled:hover:bg-slate-300 active:scale-[0.98] disabled:active:scale-100 transition-all flex items-center justify-center gap-3"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect width="12" height="8" x="6" y="14" />
          </svg>
          {isPrinting
            ? "Printing..."
            : !device
              ? "Connect & Print"
              : `Print ${totalLabels} Label${totalLabels !== 1 ? "s" : ""}`}
        </button>
      </div>

      {/* Add Custom Label Modal */}
      {isModalOpen && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-5 mb-4 animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800">New Label</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddCustomLabel} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Item Name
                </label>
                <input
                  required
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. CASHEW NUTS"
                  className="w-full h-12 px-3 border border-slate-300 rounded-lg bg-slate-50 uppercase"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Weight (grams)
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={customWeight}
                    onChange={(e) => setCustomWeight(e.target.value)}
                    placeholder="500"
                    className="w-full h-12 px-3 border border-slate-300 rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    MRP (₹)
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={customMrp}
                    onChange={(e) => setCustomMrp(e.target.value)}
                    placeholder="450"
                    className="w-full h-12 px-3 border border-slate-300 rounded-lg bg-slate-50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Shelf Life (Months)
                </label>
                <select
                  value={customShelf}
                  onChange={(e) => setCustomShelf(e.target.value)}
                  className="w-full h-12 px-3 border border-slate-300 rounded-lg bg-slate-50 font-medium text-slate-700"
                >
                  <option value="1">1 Month</option>
                  <option value="2">2 Months</option>
                  <option value="3">3 Months</option>
                  <option value="6">6 Months</option>
                  <option value="12">1 Year</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-slate-900 text-white font-bold h-12 rounded-lg mt-2 active:scale-95 transition-transform"
              >
                Add to Queue
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
