/** Matches @sovereignfs/ui's DragHandleRow icon, reproduced locally since it
 *  isn't exported. Not @sovereignfs/ui's Icon set either — that has no grip
 *  glyph. Mirrors sovereign-tasks' identical local GripIcon. */
export default function GripIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      {[3, 7, 11].map((cy) =>
        [4, 10].map((cx) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.2} fill="currentColor" />
        )),
      )}
    </svg>
  );
}
