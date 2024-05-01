import { useMutation, useQueryClient } from '@tanstack/react-query';
import { commonApi } from '@libs/api';
import { API_KEYS, MODAL_KEYS } from '@config';
import { IErrorObject } from '@impler/shared';
import { modals } from '@mantine/modals';

interface UseCancelPlanProps {
  email: string;
}

export function useCancelPlan({ email }: UseCancelPlanProps) {
  const queryClient = useQueryClient();
  const { mutate: cancelPlan, isLoading: isCancelPlanLoading } = useMutation<
    unknown,
    IErrorObject,
    void,
    [string, string]
  >([API_KEYS.CANCEL_SUBSCRIPTION, email], () => commonApi(API_KEYS.CANCEL_SUBSCRIPTION as any, {}), {
    onSuccess() {
      queryClient.invalidateQueries([API_KEYS.FETCH_ACTIVE_SUBSCRIPTION, email]);
      modals.close(MODAL_KEYS.PAYMENT_PLANS);
    },
  });

  return {
    cancelPlan,
    isCancelPlanLoading,
  };
}
