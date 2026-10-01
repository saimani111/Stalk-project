import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { LangProvider } from "./context/LangContext";
import ErrorBoundary from "./components/ErrorBoundary";
import ToastContainer from "./components/ToastContainer";

const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Profile = lazy(() => import("./pages/Profile"));
const Chat = lazy(() => import("./pages/Chat"));
const Assistant = lazy(() => import("./pages/Assistant"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-label="Loading">
      <div className="page-loader__spinner" />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LangProvider>
        <AuthProvider>
          <SocketProvider>
            <BrowserRouter>
              <ToastContainer />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/profile" element={<Profile />} />

                  <Route path="/chat" element={<Chat />} />
                  <Route path="/chat/:userId" element={<Chat />} />
                  <Route path="/assistant" element={<Assistant />} />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </SocketProvider>
        </AuthProvider>
      </LangProvider>
    </ErrorBoundary>
  );
}

export default App;
