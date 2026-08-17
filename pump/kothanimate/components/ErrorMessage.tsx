export const ErrorMessage = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="border border-red-300 text-red-300 rounded p-2">
      {children}
    </div>
  );
};
