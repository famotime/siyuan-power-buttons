import type { PowerButtonItem } from "@/shared/types";
import { sortItems } from "@/shared/utils";

export interface PreviewLayout {
  topbar: PowerButtonItem[];
  leftDockTop: PowerButtonItem[];
  leftDockBottom: PowerButtonItem[];
  rightDockTop: PowerButtonItem[];
  rightDockBottom: PowerButtonItem[];
  bottomDockLeft: PowerButtonItem[];
  bottomDockRight: PowerButtonItem[];
  statusbarLeft: PowerButtonItem[];
  statusbarRight: PowerButtonItem[];
  canvas: PowerButtonItem[];
}

export function buildPreviewLayout(items: PowerButtonItem[]): PreviewLayout {
  const layout: PreviewLayout = {
    topbar: [],
    leftDockTop: [],
    leftDockBottom: [],
    rightDockTop: [],
    rightDockBottom: [],
    bottomDockLeft: [],
    bottomDockRight: [],
    statusbarLeft: [],
    statusbarRight: [],
    canvas: [],
  };

  for (const item of sortItems(items).filter(entry => entry.visible)) {
    switch (item.surface) {
      case "topbar":
        layout.topbar.push(item);
        break;
      case "dock-left-top":
        layout.leftDockTop.push(item);
        break;
      case "dock-left-bottom":
        layout.leftDockBottom.push(item);
        break;
      case "dock-right-top":
        layout.rightDockTop.push(item);
        break;
      case "dock-right-bottom":
        layout.rightDockBottom.push(item);
        break;
      case "dock-bottom-left":
        layout.bottomDockLeft.push(item);
        break;
      case "dock-bottom-right":
        layout.bottomDockRight.push(item);
        break;
      case "statusbar-left":
        layout.statusbarLeft.push(item);
        break;
      case "statusbar-right":
        layout.statusbarRight.push(item);
        break;
      default:
        layout.canvas.push(item);
        break;
    }
  }

  return layout;
}
