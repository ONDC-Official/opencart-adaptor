import he from "he";

export function parseAttributesFromDescription(text, category) {
  const result = {};

  const decoded = he.decode(text || "");

const getMatch = (regex, groupIndex = 1) => {
    const match = decoded.match(regex);
    return match?.[groupIndex]?.trim() || "";
  };
      if (["Mobile Phone", "Tablet", "Laptop", "Camera", "Audio Accessories", "Monitor", "Desktop", "Headset", "Smart Watch"].includes(category)) {


  // General
  result.special_feature = getMatch(/Special Features?:?\s*([^\n]+)/i);
  result.os_type = getMatch(/Windows\sMobile|Mac\sOS\sX/i);
  result.os_version = getMatch(/Windows(?:\sMobile)?\s([0-9.]+)/i) || getMatch(/Mac\sOS\sX\s([a-zA-Z0-9\s]+)/i);

  // Memory and Storage
  const memMatch = decoded.match(/Memory:\s*(\d+)\s*MB\s*ROM,?\s*(\d+)\s*MB\s*RAM/i);
  if (memMatch) {
    result.rom = memMatch[1];
    result.rom_unit = "MB";
    result.ram = memMatch[2];
    result.ram_unit = "MB";
  }

  const ramMatch = decoded.match(/(\d+)\s*GB\s*(?:of\s*)?memory/i) || decoded.match(/(\d+)\s*GB\s*RAM/i) || decoded.match(/(\d+)\s*MB\s*RAM/i);
  if (ramMatch) {
    result.ram = ramMatch[1];
    result.ram_unit = ramMatch[0].includes("GB") ? "GB" : "MB";
  }

  const storageMatch = decoded.match(/(\d+)\s*GB\s*storage/i) || decoded.match(/(\d+)\s*MB\s*storage/i) || decoded.match(/(80|160|256|512)\s*GB/i) || decoded.match(/(16|32|64)\\s*GB.*?ver/i);
  if (storageMatch) {
    result.storage = storageMatch[1];
    result.storage_unit = storageMatch[0].includes("GB") ? "GB" : "MB";
  }
  if (/micro\s?sd|microsdhc/i.test(decoded)) result.storage_type = "Expandable";

  // Camera
  const primaryCamMatch = decoded.match(/(\d+(\.\d+)?)\s*megapixel.*?(camera|cam)/i);
  if (primaryCamMatch) result.primary_camera = primaryCamMatch[1] + " MP";
  if (/vga.*?camera/i.test(decoded)) result.secondary_camera = "VGA";

  // CPU and GPU
  result.cpu = getMatch(/(Intel\sCore\s2\sDuo|Apple\sM[0-9]+|Qualcomm\sMSM[0-9]+)/i);
  result.gpu = getMatch(/(NVIDIA\sGeForce\s[0-9a-zA-Z\s]+)/i);

  // Display
  const screenMatch = decoded.match(/(\d{1,2}(\.\d+)?)\s*[- ]?inch/i) || decoded.match(/([\d.]+)\s*[- ]?inch.*screen/i);
  if (screenMatch) result.screen_size = screenMatch[1];

  const resolution = decoded.match(/(\d{3,4})\s*[x×]\s*(\d{3,4})/i);
  if (resolution) result.resolution = `${resolution[1]}x${resolution[2]}`;

// Dimensions
const dimMatch =
  decoded.match(/Dimensions:\s*([\d.]+)\s*mm\s*x\s*([\d.]+)\s*mm\s*x\s*([\d.]+)\s*mm/i) ||
  decoded.match(/([\d.]+)\s*mm.*?x.*?([\d.]+)\s*mm.*?x.*?([\d.]+)\s*mm/i);

if (dimMatch) {
  result.length = dimMatch[1];
  result.breadth = dimMatch[2];
  result.height = dimMatch[3];
}


  // Weight
  const weightMatch = decoded.match(/\/\s*([\d.]+)\s*grams/i) || decoded.match(/([\d.]+)\s*grams/i);
  if (weightMatch) result.weight = weightMatch[1];

  // Battery and Playtime
  const batteryMatch = decoded.match(/(\d+)\s*mAh/i);
  if (batteryMatch) result.battery_capacity = batteryMatch[1];

  const playtime = getMatch(/up to\s+(\d+)\s*(hours|hrs)/i);
  if (playtime) result.playtime = playtime;

  // Connectivity
  const connections = [];
  if (/wi[-]?fi|802\.11/i.test(decoded)) connections.push("WiFi");
  if (/bluetooth/i.test(decoded)) connections.push("Bluetooth");
  if (/gps|a-gps/i.test(decoded)) connections.push("GPS");
  if (/gprs|edge|gsm|wcdma|hsdpa/i.test(decoded)) connections.push("Cellular");
  if (/firewire/i.test(decoded)) connections.push("FireWire");
  if (/dvi/i.test(decoded)) connections.push("DVI");
  if (/HSPA\\+|21Mbps/i.test(decoded)) connections.push("HSPA+");
  if (/DLNA/i.test(decoded)) connections.push("DLNA");
  if (/Wi[-]?Fi|802\\.11/i.test(decoded)) connections.push("WiFi");
  if (/Bluetooth/i.test(decoded)) connections.push("Bluetooth");
  if (/USB/i.test(decoded)) connections.push("USB");
  if (/SIM slot/i.test(decoded)) connections.push("SIM");
  result.connectivity = connections.join(", ");

  // Form factor
  if (/touchscreen|smartphone|multi[-\s]?touch/i.test(decoded)) result.form_factor = "Touchscreen";
  else if (/dslr|camera/i.test(decoded)) result.form_factor = "DSLR";
  else if (/wearable|clip on/i.test(decoded)) result.form_factor = "Wearable";
  else if (/clamshell|laptop|notebook/i.test(decoded)) result.form_factor = "Clamshell";

  // Includes / Special Features
  const features = [];
  if (/iSight/i.test(decoded)) features.push("iSight Camera");
  if (/multi[-\s]?touch/i.test(decoded)) features.push("Multi-touch");
  if (/itunes/i.test(decoded)) features.push("iTunes");
  if (/cover\sflow/i.test(decoded)) features.push("Cover Flow");

  const includes = [];
  if (/3\.5\s*mm.*jack/i.test(decoded)) includes.push("3.5 mm Jack");
  if (/fm\s*radio/i.test(decoded)) includes.push("FM Radio");
  if (/apple remote/i.test(decoded)) includes.push("Apple Remote");
  if (/stereo.*headset/i.test(decoded)) includes.push("Stereo Headset");
  if (/3\\.5mm/i.test(decoded)) includes.push("3.5mm Jack");
  if (/sound dock/i.test(decoded)) includes.push("Sound Dock");
  if (/Samsung Stick/i.test(decoded)) includes.push("Samsung Stick");

  const special = getMatch(/Special Features?:?\s*(.+)/i);
  if (special) {
    result.special_feature = special;
  }
  
  const specials = [];
  if (/TouchWiz/i.test(decoded)) specials.push("TouchWiz UX");
  if (/Flash\\sPlayer\\s*10\\.2/i.test(decoded)) specials.push("Flash 10.2");
  if (/subwoofer/i.test(decoded)) specials.push("Subwoofer");

  result.includes = includes.join(', ');

  result.special_feature = getMatch(/Special Features?:?\s*([^\n]+)/i);
  result.special_feature = features.join(", ");
  result.includes = [...new Set([...features, ...includes])].join(", ");

  result.os_type = getMatch(/(Android|Windows\\sMobile|Mac\\sOS\\sX)/i);
  result.os_version = getMatch(/Android\\s([0-9.]+)/i);
  const camMatch = decoded.match(/equipped with\\s*(\\d+)\\s*megapixel.*?rear.*?(camera|cam)/i);
  if (camMatch) result.primary_camera = camMatch[1] + " MP";

  const frontCamMatch = decoded.match(/(\\d+)\\s*megapixel.*?front.*?(camera|cam)/i);
  if (frontCamMatch) result.secondary_camera = frontCamMatch[1] + " MP";
  const battery = decoded.match(/(\\d{3,5})mAh/i);
  if (battery) result.battery_capacity = battery[1];

  const playtime1 = decoded.match(/(\\d{1,2})hours.*?video-playback/i);
  if (playtime1) result.playtime = playtime1[1];




  // Series
  const series = getMatch(/Series\s([a-zA-Z0-9]+)/i);
  if (series) result.series = series;
      }


  return result;
}