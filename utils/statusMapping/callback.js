import axios from 'axios';

export async function sendOnStatusCallback(bapUri, payload, authHeaders = {}) {
  if (!bapUri) {
    throw new Error("bapUri is required to send on_status callback");
  }

  const callbackUrl = `${bapUri.replace(/\/$/, '')}/on_status`;

  try {
    const response = await axios.post(callbackUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,   // Spread in signature-related headers here
      },
    });
    return response.data;
  } catch (err) {
    console.error('Error calling /on_status:', err.message);
    throw err;
  }
}

export default { sendOnStatusCallback };
