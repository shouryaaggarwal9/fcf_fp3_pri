// "use client";

// import { useWebUSB } from "@/hooks/useWeb";
// import { generateTSPL } from "@/utils/tspl";

// export default function DiagnosticTest() {
//   const { device, isPrinting, error, connect, print } = useWebUSB();

//   const handleTestPrint = async () => {
//     // Generate the sparse 7-row bitmap we just created
//     const tsplData = generateTSPL();
//     await print(tsplData);
//   };

//   return (
//     <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-100 gap-6 text-slate-800">
//       <h1 className="text-2xl font-bold tracking-tight">Hardware Test</h1>
//       <p className="text-sm text-slate-500 text-center max-w-xs">
//         Testing pure BITMAP command with 7 sparse rows.
//       </p>

//       {error && (
//         <div className="bg-red-100 border border-red-200 text-red-700 p-3 rounded-lg text-sm w-full max-w-xs text-center">
//           {error}
//         </div>
//       )}

//       <div className="flex flex-col gap-4 w-full max-w-xs mt-4">
//         {!device ? (
//           <button
//             onClick={connect}
//             className="bg-slate-900 text-white font-bold py-4 px-8 rounded-xl shadow-md hover:bg-slate-800 active:scale-95 transition-all"
//           >
//             1. Connect Printer
//           </button>
//         ) : (
//           <button
//             onClick={handleTestPrint}
//             disabled={isPrinting}
//             className="bg-blue-600 text-white font-bold py-4 px-8 rounded-xl shadow-md hover:bg-blue-700 active:scale-95 disabled:bg-slate-400 transition-all flex justify-center items-center gap-2"
//           >
//             {isPrinting ? (
//               "Sending Data..."
//             ) : (
//               <>
//                 <svg
//                   xmlns="http://www.w3.org/2000/svg"
//                   width="20"
//                   height="20"
//                   viewBox="0 0 24 24"
//                   fill="none"
//                   stroke="currentColor"
//                   strokeWidth="2.5"
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                 >
//                   <polyline points="6 9 6 2 18 2 18 9" />
//                   <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
//                   <rect width="12" height="8" x="6" y="14" />
//                 </svg>
//                 2. Print Sparse Bitmap
//               </>
//             )}
//           </button>
//         )}
//       </div>

//       {device && (
//         <p className="text-emerald-600 font-semibold text-sm mt-4">
//           ✓ USB Connected
//         </p>
//       )}
//     </div>
//   );
// }
