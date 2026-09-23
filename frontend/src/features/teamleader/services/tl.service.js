import axios from 'axios';

const tlApi = axios.create({
  baseURL: 'http://localhost:3000/api/teamleader',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export const getRequestsForReview = async () => {
  const response = await tlApi.get('/requests-for-review');
  return response.data;
};

export const getMyInterns = async () => {
  const response = await tlApi.get('/interns');
  return response.data;
};

export const reviewRequest = async (id, action, rejectionReason) => {
  const payload = action === 'reject' ? { action, rejectionReason } : { action };
  const response = await tlApi.patch(`/requests/${id}/review`, payload);
  return response.data;
};

export const createIntern = async (payload) => {
  try {
    const response = await tlApi.post('/create-intern', payload);
    return response.data;
  } catch (error) {
    const data = error.response?.data;
    const validationMessage = data?.errors?.map(({ msg }) => msg).join(' ');
    throw new Error(validationMessage || data?.message || 'Unable to create intern.', { cause: error });
  }
};