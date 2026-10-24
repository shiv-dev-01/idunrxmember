import { Styles } from "react-joyride";

export const TOUR_STYLES: Styles = {
  options: {
    arrowColor: "#c8ad68",
    backgroundColor: "#c8ad68",
    overlayColor: "rgba(200, 173, 104, 0.85)",
    primaryColor: "#c8ad68",
    textColor: "#c8ad68",
    zIndex: 1000,
    spotlightPadding: 16,
  },

  tooltipContainer: {
    textAlign: "left",
    padding: "24px",
    borderRadius: "12px",
    boxShadow: "0 20px 40px -12px rgba(0,0,0,0.25)",
    maxWidth: "420px",
    width: "100%",
    backgroundColor: "#c8ad68",
    border: "1px solid #c8ad68",
  },

  buttonNext: {
    padding: "10px 20px",
    fontSize: "14px",
    backgroundColor: "#c8ad68",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    transition: "all 0.2s",
    "&:hover": {
      backgroundColor: "#b59357",
      transform: "translateY(-1px)",
    },
  },

  buttonBack: {
    marginRight: "10px",
    padding: "10px 20px",
    fontSize: "14px",
    backgroundColor: "transparent",
    border: "1px solid #c8ad68",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 500,
    color: "#c8ad68",
    transition: "all 0.2s",
    "&:hover": {
      color: "#b59357",
      borderColor: "#b59357",
      transform: "translateY(-1px)",
    },
  },

  buttonSkip: {
    padding: "10px",
    fontSize: "14px",
    color: "#c8ad68",
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    fontWeight: 500,
    transition: "all 0.2s",
    "&:hover": {
      color: "#b59357",
    },
  },

  tooltip: {
    fontSize: "14px",
    lineHeight: 1.6,
    color: "#fff",
  },

  tooltipTitle: {
    fontSize: "18px",
    fontWeight: 600,
    marginBottom: "12px",
    color: "#fff",
  },

  tooltipContent: {
    marginBottom: "20px",
    color: "#fff",
    fontSize: "15px",
  },

  spotlight: {
    backgroundColor: "transparent",
    border: "2px solid #c8ad68",
    borderRadius: "12px",
  },
};

export const TOUR_LOCALE = {
  back: "Previous",
  close: "Close",
  last: "Got it!",
  next: "Next",
  skip: "Skip tour",
};
