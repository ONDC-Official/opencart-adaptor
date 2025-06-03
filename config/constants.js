export const BPP_ID = "localhost:3000";
export const BPP_URI = "http://localhost:3000";

export const DEFAULT_CITY = "Delhi";
export const DEFAULT_COURT_JURISDICTION = "Bengaluru";
export const DEFAULT_TAX_NUMBER = "gst_number_of_sellerNP";
export const DEFAULT_PROVIDER_TAX_NUMBER = "PAN_number_of_provider";
export const DEFAULT_CONTACT = "help@opencart.com,18004254444";
export const DEFAULT_CATEGORY_ID = "999999";


export const DEFAULT_CANCELLATION_TERMS = [
  {
    fulfillment_state: "Pending",
    reason_code: "buyer_changed_mind",
    cancellable: true,
    cancellation_fee: {
      currency: "INR",
      value: "0.00"
    }
  },
  {
    fulfillment_state: "Accepted",
    reason_code: "buyer_changed_mind",
    cancellable: true,
    cancellation_fee: {
      currency: "INR",
      value: "20.00"
    }
  },
  {
    fulfillment_state: "Packed",
    reason_code: "buyer_changed_mind",
    cancellable: true,
    cancellation_fee: {
      currency: "INR",
      value: "50.00"
    }
  }
];

export const TRANSACTION_LEVEL_TERMS = [
  {
    code: "bpp_terms",
    list: [
      { code: "max_liability", value: "2" },
      { code: "max_liability_cap", value: "10000.00" },
      { code: "mandatory_arbitration", value: "false" },
      { code: "court_jurisdiction", value: "Bengaluru" },
      { code: "delay_interest", value: "7.50" },
      { code: "tax_number", value: "gst_number_of_sellerNP" },
      { code: "provider_tax_number", value: "PAN_number_of_provider" }
    ]
  }
];
