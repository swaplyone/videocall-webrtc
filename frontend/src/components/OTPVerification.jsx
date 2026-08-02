import React from 'react';
import BottomSheet from './BottomSheet';
import { apiClient } from '../utils/apiClient';

export default function OTPVerification({ email, tempToken, purpose = 'FIRST_LOGIN', onVerified, onCancel, showCancel = false }) {
  const handleVerifySubmit = async (code) => {
    apiClient.setAuthToken(tempToken);
    const data = await apiClient.verifyOtp(code, purpose);
    if (data.success) {
      onVerified(data.accessToken, data.user);
    } else {
      throw new Error(data.error || 'Verification failed. Please try again.');
    }
  };

  const handleResendOtp = async () => {
    apiClient.setAuthToken(tempToken);
    await apiClient.resendOtp(purpose);
  };

  return (
    <BottomSheet
      isOpen={true}
      email={email}
      onVerifySubmit={handleVerifySubmit}
      onResendOtp={handleResendOtp}
      onClose={onCancel}
      showCancel={showCancel}
    />
  );
}
