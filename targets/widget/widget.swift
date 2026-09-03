import WidgetKit
import SwiftUI

private let appGroup = "group.com.tayoaki.repcard"

struct Snapshot: Codable {
  var overall: Int
  var streak: Int
  var bestStreak: Int
  var handle: String
  var position: String
}

private func loadSnapshot() -> Snapshot {
  // Empty state renders cleanly for a brand-new user (OVR 0 / streak 0).
  let fallback = Snapshot(overall: 0, streak: 0, bestStreak: 0, handle: "athlete", position: "ATH")
  guard
    let defaults = UserDefaults(suiteName: appGroup),
    let raw = defaults.string(forKey: "cardSnapshot")?.data(using: .utf8),
    let snap = try? JSONDecoder().decode(Snapshot.self, from: raw)
  else { return fallback }
  return snap
}

struct Entry: TimelineEntry { let date: Date; let snap: Snapshot }

struct Provider: TimelineProvider {
  func placeholder(in _: Context) -> Entry { Entry(date: .now, snap: loadSnapshot()) }
  func getSnapshot(in _: Context, completion: @escaping (Entry) -> Void) {
    completion(Entry(date: .now, snap: loadSnapshot()))
  }
  func getTimeline(in _: Context, completion: @escaping (Timeline<Entry>) -> Void) {
    // Streak is day-based; refresh just after the next local midnight.
    let midnight = Calendar.current.nextDate(
      after: .now, matching: DateComponents(hour: 0, minute: 1), matchingPolicy: .nextTime
    ) ?? Date(timeIntervalSinceNow: 3600)
    completion(Timeline(entries: [Entry(date: .now, snap: loadSnapshot())], policy: .after(midnight)))
  }
}

struct RepCardWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: Entry

  var body: some View {
    ZStack {
      LinearGradient(
        colors: [Color(red: 0.02, green: 0.07, blue: 0.05), Color(red: 0.02, green: 0.37, blue: 0.27)],
        startPoint: .topLeading, endPoint: .bottomTrailing
      )
      VStack(alignment: .leading, spacing: 4) {
        Text("OVR").font(.system(size: 10, weight: .bold)).foregroundColor(.white.opacity(0.5))
        Text("\(entry.snap.overall)")
          .font(.system(size: family == .systemSmall ? 44 : 54, weight: .heavy))
          .foregroundColor(Color(red: 0.43, green: 0.91, blue: 0.72))
        Spacer(minLength: 0)
        HStack(spacing: 5) {
          Text("🔥 \(entry.snap.streak)d").font(.system(size: 13, weight: .semibold)).foregroundColor(.white)
          if family != .systemSmall {
            Text("· best \(entry.snap.bestStreak)").font(.system(size: 12)).foregroundColor(.white.opacity(0.6))
          }
        }
        Text("@\(entry.snap.handle)").font(.system(size: 10)).foregroundColor(.white.opacity(0.55))
      }
      .padding(14)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
  }
}

@main
struct RepCardWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "RepCardWidget", provider: Provider()) { entry in
      if #available(iOS 17.0, *) {
        RepCardWidgetView(entry: entry).containerBackground(.clear, for: .widget)
      } else {
        RepCardWidgetView(entry: entry)
      }
    }
    .configurationDisplayName("RepCard")
    .description("Your OVR and streak, always in view.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
