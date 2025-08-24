import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Footer } from "./Footer";
import "@testing-library/jest-dom/vitest";

describe("<Footer>", () => {
  beforeEach(() => {
    render(<Footer />);
  });

  test("displays the current year", () => {
    const footer = document.querySelector("footer");
    expect(footer).toHaveTextContent("2025");
  });
});
