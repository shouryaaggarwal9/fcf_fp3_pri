import { useState, useCallback } from "react";

export function useWebUSB() {
  const [device, setDevice] = useState<any>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    try {
      if (!navigator.usb) {
        throw new Error("WebUSB is not supported in this browser.");
      }

      const selectedDevice = await navigator.usb.requestDevice({ filters: [] });

      await selectedDevice.open();
      if (selectedDevice.configuration === null) {
        await selectedDevice.selectConfiguration(1);
      }
      await selectedDevice.claimInterface(0);

      setDevice(selectedDevice);
      setError(null);
    } catch (err: any) {
      console.error("USB Connection Error:", err);
      setError(err.message || "Failed to connect to printer");
    }
  }, []);

  const print = useCallback(
    async (data: any) => {
      if (!device) {
        setError("No printer connected");
        return;
      }

      setIsPrinting(true);
      setError(null);

      try {
        const endpoint =
          device.configuration?.interfaces[0].alternate.endpoints.find(
            (ep: any) => ep.direction === "out",
          );

        if (!endpoint) {
          throw new Error("Could not find a valid USB output endpoint.");
        }

        // Send the entire payload in one continuous shot.
        // TSPL commands are more reliable when the printer receives the full byte stream in one transfer.
        const payload =
          data instanceof Uint8Array ? data : new Uint8Array(data);
        await device.transferOut(endpoint.endpointNumber, payload);
      } catch (err: any) {
        console.error("Printing Error:", err);
        setError(err.message || "Failed to print");
      } finally {
        setIsPrinting(false);
      }
    },
    [device],
  );

  return { device, isPrinting, error, connect, print };
}
