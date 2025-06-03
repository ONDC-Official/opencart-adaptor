export const catalogConfig = {
  fulfillments: [
    {
      id: "F1",
      type: "Delivery",
    },
    {
      id: "F2",
      type: "Self-Pickup",
    },
    {
      id: "F3",
      type: "Delivery and Self-Pickup",
    }
  ],
  descriptor: {
    name: "Opencart Store",
    short_desc: "Online Electronics Store",
    long_desc: "Online Electronics Store",
    images: [
      "https://img.crofarm.com/images/product-feed-banners/f6f5e323302a.png",
    ],
    tags: [
      {
        code: "bpp_terms",
        list: [
          {
            code: "np_type",
            value: "ISN",
          },
          {
            code: "accept_bap_terms",
            value: "Y",
          },
          {
            code: "collect_payment",
            value: "Y",
          }
        ],
      },
    ],
  },
  provider: {
    time: {
      label: "enable",
      days: "1,2,3,4,5,6,7",
      schedule: {
        holidays: [],
        frequency: "PT4H",
        times: ["0900", "1800"]
      },
      range: {
        start: "0900",
        end: "1800"
      },
    },
    fulfillments: [
      {
        id: "F1",
        type: "Delivery",
        contact: {
          email: "abc@xyz.com",
        },
      },
      {
        id: "F2",
        type: "Self-Pickup",
        contact: {
          email: "abc@xyz.com",
        },
      },
      {
        id: "F3",
        type: "Buyer-Delivery",
        contact: {
          email: "abc@xyz.com",
        },
      }
    ],
    fssai_license_no: null,
    ttl: "PT24H",
    location: {
      id: "L1",
      gps: "28.5500962,77.2443268",
      circle: {
        radius: {
          unit: "km",
          value: "3",
        },
      },
    },
    tags: [
      {
        code: "type",
        list: [
          {
            code: "type",
            value: "item"
          }
        ]
      },
      {
        code: "warranty",
        list: [
          {
            code: "duration",
            value: "12"
          },
          {
            code: "unit",
            value: "months"
          }
        ]
      },
      {
        code: "brand",
        list: [
          {
            code: "name",
            value: "Generic"
          }
        ]
      },
      {
        code: "specifications",
        list: [
          {
            code: "category",
            value: "Electronics"
          },
          {
            code: "subcategory",
            value: "Gadgets"
          }
        ]
      },
      {
        code: "timing",
        list: [
          {
            code: "day_from",
            value: "1"
          },
          {
            code: "day_to",
            value: "7"
          },
          {
            code: "time_from",
            value: "0900"
          },
          {
            code: "time_to",
            value: "1800"
          }
        ]
      }
    ]
  },
  item: {
    quantity: {
      unitized: {
        measure: {
          unit: "piece",
          value: "1",
        },
      },
      maximum: {
        count: "10",
      },
    },
    "@ondc/org/returnable": true,
    "@ondc/org/cancellable": true,
    "@ondc/org/seller_pickup_return": true,
    "@ondc/org/time_to_ship": "PT24H",
    "@ondc/org/available_on_cod": true,
    "@ondc/org/return_window": "P7D",
    "@ondc/org/contact_details_consumer_care": "Support, support@store.com,18004254444",
  }
}; 