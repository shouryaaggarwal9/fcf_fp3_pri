// hooks/useWebUSB.ts
import { useState, useCallback } from "react";

export function useWebUSB() {
  const [device, setDevice] = useState<USBDevice | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    try {
      if (!navigator.usb) {
        throw new Error(
          "WebUSB is not supported in this browser. Please use Chrome on Android.",
        );
      }

      // Request any USB device. You can filter by vendorId later if needed.
      const selectedDevice = await navigator.usb.requestDevice({ filters: [] });

      await selectedDevice.open();
      // Select configuration and claim primary interface
      if (selectedDevice.configuration === null) {
        await selectedDevice.selectConfiguration(1);
      }
      await selectedDevice.claimInterface(0);

      setDevice(selectedDevice);
      setError(null);
    } catch (err: unknown) {
      console.error("USB Connection Error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to connect to printer",
      );
    }
  }, []);

  const print = useCallback(
    async (data: Uint8Array) => {
      if (!device) {
        setError("No printer connected");
        return;
      }

      setIsPrinting(true);
      setError(null);

      try {
        // Find the USB OUT endpoint to send data to the printer
        const endpoint =
          device.configuration?.interfaces[0].alternate.endpoints.find(
            (ep) => ep.direction === "out",
          );

        if (!endpoint) {
          throw new Error("Could not find a valid USB output endpoint.");
        }

        // Send the TSPL byte array directly to the printer
        // await device.transferOut(endpoint.endpointNumber, data);
        await device.transferOut(
          endpoint.endpointNumber,
          data.buffer as ArrayBuffer,
        );
      } catch (err: unknown) {
        console.error("Printing Error:", err);
        setError(err instanceof Error ? err.message : "Failed to print");
      } finally {
        setIsPrinting(false);
      }
    },
    [device],
  );

  return { device, isPrinting, error, connect, print };
}
