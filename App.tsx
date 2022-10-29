import {Database, Model, Q} from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import DatabaseProvider, {
  withDatabase,
} from '@nozbe/watermelondb/DatabaseProvider';
import {text, writer} from '@nozbe/watermelondb/decorators';
import withObservables from '@nozbe/with-observables';
import React, {useEffect, useState} from 'react';
import {Button, StyleSheet, Text, View} from 'react-native';
import {compose} from 'recompose';

import {appSchema, tableSchema} from '@nozbe/watermelondb';

enum Location {
  YARD = 'yard',
  PORCH = 'porch',
}

const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'posts',
      columns: [{name: 'location', type: 'string'}],
    }),
  ],
});

class Post extends Model {
  static table = 'posts';

  @text('location') location: string;

  static async createOne(db: Database, loc: Location) {
    return await db.write(async () => {
      return await db.get<Post>('posts').create(post => {
        post.location = loc;
      });
    });
  }

  @writer async updateLocation(loc: Location) {
    return await this.update(post => {
      post.location = loc;
    });
  }
}

export default function App() {
  const [db, setDB] = useState<Database>();

  useEffect(() => {
    const adapter = new SQLiteAdapter({
      schema,
      onSetUpError: error => {
        console.error('Unexpected DB fail');
      },
    });

    setDB(
      new Database({
        adapter,
        modelClasses: [Post],
      }),
    );
  }, []);

  async function createLocatedPost() {
    return await db!.write(async () => {
      return await db!.get<Post>('posts').create(post => {
        post.location = Location.PORCH;
      });
    });
  }

  async function createThenSetLoc() {
    const created = await db!.write(async () => {
      return await db!.get<Post>('posts').create(post => {
        post.location = Location.YARD;
      });
    });

    return await created.updateLocation(Location.PORCH);
  }

  async function createLoadSet() {
    const created = await db!.write(async () => {
      return await db!.get<Post>('posts').create(post => {
        post.location = Location.YARD;
      });
    });
    const loaded = await db!.get<Post>('posts').find(created.id);

    return await loaded.updateLocation(Location.PORCH);
  }

  return db ? (
    <DatabaseProvider database={db}>
      <View style={styles.container}>
        <LiveCounter />
        <Button
          onPress={createLocatedPost}
          title="Create Post w/Location Set"
        />
        <Button
          onPress={createThenSetLoc}
          title="Create Post, Then Set Location"
        />
        <Button
          onPress={createLoadSet}
          title="Create, Reload, Then Set Location"
        />
      </View>
    </DatabaseProvider>
  ) : null;
}

interface LiveProps {
  count: number;
}

function Counter(props: LiveProps) {
  return <Text>{`Total post count: ${props.count}`}</Text>;
}

const LiveCounter = compose<LiveProps, {}>(
  withDatabase,
  withObservables<{database: Database}, LiveProps>([], ({database}) => ({
    count: database
      .get<Post>('posts')
      .query(Q.where('location', Location.PORCH))
      .observeCount() as unknown as number,
  })),
)(Counter);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
