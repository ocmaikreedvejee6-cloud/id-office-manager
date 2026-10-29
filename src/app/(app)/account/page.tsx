import PasswordForm from './password-form'

export default function AccountPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-bold text-green-900">Change password</h1>
      <p className="mb-4 text-sm text-gray-600">Pick a password you do not use anywhere else.</p>
      <PasswordForm />
    </>
  )
}
