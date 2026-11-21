"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="print:hidden rounded-md bg-black px-4 py-2 text-sm text-white">
      Save as PDF / Print
    </button>
  );
}
