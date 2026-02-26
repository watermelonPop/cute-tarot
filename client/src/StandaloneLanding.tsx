import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function StandaloneLanding() {
  const navigate = useNavigate();

  useEffect(() => {
    // Small delay to let iOS treat this as a proper standalone launch
    setTimeout(() => navigate("/cards"), 0);
  }, [navigate]);

  return null; // or a loading spinner
}