export function identifyCarrier(trackingNumber: string): {
  carrier: string;
  trackingUrl: string | null;
} {
  const trimmedNumber = trackingNumber.trim();

  const patterns = [
    {
      name: "UPS",
      regex: /^1Z[0-9A-Z]{16}$/,
      getUrl: (tn: string) => `https://www.ups.com/track?tracknum=${tn}`,
    },
    {
      name: "FedEx",
      regex: /^(\d{12}|\d{15}|\d{20})$/,
      getUrl: (tn: string) =>
        `https://www.fedex.com/fedextrack/?tracknumbers=${tn}`,
    },
    {
      name: "USPS",
      regex:
        /^(94|93|92|95|96|98|91|9205|9208|9202|9200)[0-9]{15,22}$|^[A-Z]{2}\d{9}US$/i,
      getUrl: (tn: string) =>
        `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tn}`,
    },
    {
      name: "DHL Express",
      regex: /^JD\d{18}$/,
      getUrl: (tn: string) =>
        `https://www.dhl.com/global-en/home/tracking.html?tracking-id=${tn}`,
    },
    {
      name: "Amazon Logistics",
      regex: /^TBA[0-9]{12,}$/,
      getUrl: (tn: string) =>
        `https://www.amazon.com/progress-tracker/package/${tn}`,
    },
    {
      name: "OnTrac",
      regex: /^[A-Z]{2}\d{12}$/,
      getUrl: (tn: string) =>
        `https://www.ontrac.com/trackingres.asp?tracking_number=${tn}`,
    },
    {
      name: "Lasership",
      regex: /^LX\d{15}$/,
      getUrl: (tn: string) => `https://www.lasership.com/track/${tn}`,
    },
    {
      name: "GLS",
      regex: /^1\d{10}$/,
      getUrl: (tn: string) =>
        `https://gls-group.eu/EU/en/parcel-tracking?match=${tn}`,
    },
    {
      name: "Deliv",
      regex: /^DLV[0-9]{10,}$/,
      getUrl: () => `https://www.deliv.co/track`,
    },
  ];

  for (const pattern of patterns) {
    if (pattern.regex.test(trimmedNumber)) {
      return {
        carrier: pattern.name,
        trackingUrl: pattern.getUrl(trimmedNumber),
      };
    }
  }

  return {
    carrier: "Unknown Carrier",
    trackingUrl: null,
  };
}