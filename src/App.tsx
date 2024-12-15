
import './index.css';
import React from 'react';
import deDE from 'antd/lib/locale/de_DE';
import moment from 'moment';
import 'moment/locale/de';
import { ConfigProvider, Layout } from 'antd';
import SideMenu from './Components/SideMenu/SideMenu';
import AppRouter from './Components/AppRouter';
import { AuthProvider } from './AuthContext';
moment.locale('de');

const App: React.FC = () => {

  return (
    <AuthProvider>
      <ConfigProvider locale={deDE}
    theme={{
      components: {
        Menu: { darkItemSelectedBg: '#F3D324' }
      }
    }}>
      <Layout style={{ minHeight: '100vh' }}>
        <SideMenu />
        <Layout>
         
          <AppRouter />
        </Layout>
      </Layout>
    </ConfigProvider>
    </AuthProvider>
   
  );
};

export default App;