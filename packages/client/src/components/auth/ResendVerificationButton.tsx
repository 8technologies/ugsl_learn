import { useMutation } from "@apollo/client/react";
import { useState } from "react";
import { RESEND_VERIFICATION_EMAIL } from "~/gql/mutations";
import { toFriendlyErrorMessage } from "~/utils/errors";

type ResendResult = {
  resendVerificationEmail: { success: boolean; message: string };
};

// Sends a fresh verification link to `email`
export const ResendVerificationButton = ({ email }: { email: string }) => {
  const [resend, { loading }] = useMutation<ResendResult>(RESEND_VERIFICATION_EMAIL);
  const [notice, setNotice] = useState<string | null>(null);

  const handleClick = async () => {
    setNotice(null);
    try {
      const { data } = await resend({ variables: { email } });
      setNotice(data?.resendVerificationEmail.message ?? "A new link is on its way.");
    } catch (error) {
      setNotice(toFriendlyErrorMessage(error, "Could not send the email. Please try again."));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={loading || !email}
        className="w-full rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
      >
        {loading ? "Sending…" : "Resend verification email"}
      </button>
      {notice && <p className="text-sm text-gray-500">{notice}</p>}
    </div>
  );
};
