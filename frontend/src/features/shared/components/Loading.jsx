import "./Loading.css";

export default function Loading({ message = "Loading..." }) {
  return (
    <div className="shared-loading" role="status">
      <span className="shared-loading-spinner" />
      <span>{message}</span>
    </div>
  );
}