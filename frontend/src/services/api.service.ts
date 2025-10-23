import axios from '../lib/axios';

interface VersionInfo {
  version: string;
  name: string;
}

class ApiService {
  async getVersion(): Promise<VersionInfo> {
    const response = await axios.get('/version');
    return response.data;
  }
}

export default new ApiService();
