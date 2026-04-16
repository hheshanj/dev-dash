import axios from 'axios';

const API_URL = 'http://localhost:3001/api/settings';

export const fetchSettings = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

export const saveSettings = async (settingsPayload) => {
  const response = await axios.post(API_URL, settingsPayload);
  return response.data;
};
